import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, createCheckout } from "../_shared/asaas.ts";

const BodySchema = z.object({
  itens: z.array(z.object({
    variacao_id: z.string().uuid(),
    quantidade: z.number().int().min(1).max(100),
  })).min(1).max(20).optional(),
  evento_id: z.string().uuid().nullable().optional(),
  forma_pagamento: z.enum(["pix", "credit_card"]),
  parcelas: z.number().int().min(1).max(12).optional(),
  pedido_ids: z.array(z.string().uuid()).min(1).max(50).optional(),
  force_regenerate: z.boolean().optional(),
});

const CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Body inválido", detalhes: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsed.data;
    const parcelasReq = Math.max(1, Math.min(Number(body.parcelas) || 1, 12));
    const isParcelado = body.forma_pagamento === "credit_card" && parcelasReq > 1;

    // Carrega variações + produto
    const variacaoIds = body.itens.map((i) => i.variacao_id);
    const { data: variacoes, error: vErr } = await admin
      .from("produto_variacoes")
      .select("id, nome, preco, preco_parcelado, max_parcelas, ativo, produto_id, produtos:produto_id(id,nome,ativo)")
      .in("id", variacaoIds);

    if (vErr || !variacoes || variacoes.length === 0) {
      return new Response(JSON.stringify({ error: "Variações não encontradas" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar todos ativos + estoque
    const varMap = new Map<string, any>(variacoes.map((v: any) => [v.id, v]));
    let valorTotal = 0;
    let maxParcelasPermitidas = 21;
    const lineItems: { description: string; quantity: number; value: number; variacao_id: string; preco_unit: number }[] = [];

    for (const it of body.itens) {
      const v = varMap.get(it.variacao_id);
      if (!v || !v.ativo || !v.produtos?.ativo) {
        return new Response(JSON.stringify({ error: `Produto/variação inativo: ${it.variacao_id}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Valida estoque
      const { data: estoqueRow } = await admin.rpc("contar_estoque_produto", { p_variacao_id: it.variacao_id });
      const est = Array.isArray(estoqueRow) ? estoqueRow[0] : estoqueRow;
      if (est?.disponivel !== null && est?.disponivel !== undefined && est.disponivel < it.quantidade) {
        return new Response(JSON.stringify({ error: `Estoque insuficiente para ${v.produtos?.nome} - ${v.nome} (${est.disponivel} disponíveis)` }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const preco = isParcelado ? Number(v.preco_parcelado || v.preco) : Number(v.preco);
      const valorLinha = preco * it.quantidade;
      valorTotal += valorLinha;
      maxParcelasPermitidas = Math.min(maxParcelasPermitidas, v.max_parcelas || 1);

      const titulo = `${v.produtos.nome} - ${v.nome}`;
      lineItems.push({
        description: titulo,
        quantity: it.quantidade,
        value: preco,
        variacao_id: it.variacao_id,
        preco_unit: preco,
      });
    }

    valorTotal = Number(valorTotal.toFixed(2));
    if (valorTotal <= 0) {
      return new Response(JSON.stringify({ error: "Valor total inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxParcelas = isParcelado ? Math.max(1, Math.min(parcelasReq, maxParcelasPermitidas)) : 1;

    // Comprador
    const { data: compradorRows, error: compErr } = await admin.rpc("get_comprador_dados", { p_user_id: user.id });
    if (compErr || !compradorRows || compradorRows.length === 0) {
      return new Response(JSON.stringify({ error: "Não foi possível resolver dados do comprador" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const comprador = compradorRows[0];
    if (!comprador.cpf || !comprador.nome) {
      return new Response(JSON.stringify({ error: "Comprador sem CPF/nome cadastrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customer = await getOrCreateCustomer({
      name: comprador.nome,
      cpfCnpj: comprador.cpf,
      email: comprador.email || user.email || undefined,
      mobilePhone: comprador.celular || undefined,
    });

    // Cria pedidos pendentes
    const pedidoIds: string[] = [];
    for (const li of lineItems) {
      const v = varMap.get(li.variacao_id);
      const { data: pedido, error: pErr } = await admin
        .from("pedidos_produtos")
        .insert({
          user_id: user.id,
          evento_id: body.evento_id || null,
          produto_id: v.produto_id,
          variacao_id: li.variacao_id,
          nome_comprador: comprador.nome,
          cpf_comprador: comprador.cpf,
          email_comprador: comprador.email || user.email || null,
          celular_comprador: comprador.celular || null,
          quantidade: li.quantity,
          valor_unitario: li.preco_unit,
          valor_total: Number((li.preco_unit * li.quantity).toFixed(2)),
          status: "pendente",
          forma_pagamento: body.forma_pagamento,
          parcelas: maxParcelas,
          asaas_customer_id: customer.id,
        })
        .select("id")
        .single();
      if (pErr) {
        console.error("[produtos-create-checkout] insert pedido falhou", pErr);
        return new Response(JSON.stringify({ error: pErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      pedidoIds.push(pedido.id);
    }

    const SITE_BASE = "https://colegiozampieri.com.br";
    const eventoQuery = body.evento_id ? `&evento=${body.evento_id}` : "";
    const successUrl = `${SITE_BASE}/eventos/sucesso?tipo=produto${eventoQuery}`;
    const cancelUrl = `${SITE_BASE}/eventos/meus-ingressos?status=cancel`;
    const expiredUrl = `${SITE_BASE}/eventos/meus-ingressos?status=expired`;

    const billingTypes = isParcelado ? (["CREDIT_CARD"] as const) : (["PIX", "CREDIT_CARD"] as const);
    const chargeTypes = isParcelado ? (["DETACHED", "INSTALLMENT"] as const) : (["DETACHED"] as const);

    const checkout = await createCheckout({
      customer: customer.id,
      billingTypes: billingTypes as any,
      chargeTypes: chargeTypes as any,
      items: lineItems.map((li) => ({
        name: li.description,
        description: li.description,
        quantity: li.quantity,
        value: li.preco_unit,
      })),
      successUrl,
      cancelUrl,
      expiredUrl,
      // Prefixo para o webhook saber que se trata de pedidos_produtos
      externalReference: `prod:${pedidoIds.join(",")}`,
      minutesToExpire: 1440,
      maxInstallmentCount: isParcelado ? maxParcelas : undefined,
    });

    const checkoutUrl = checkout.link || checkout.url || checkout.checkoutUrl;
    const checkoutId = checkout.id;

    await admin
      .from("pedidos_produtos")
      .update({ checkout_url: checkoutUrl, checkout_id: checkoutId })
      .in("id", pedidoIds);

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, checkout_id: checkoutId, pedido_ids: pedidoIds, valor_total: valorTotal }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[produtos-create-checkout]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
