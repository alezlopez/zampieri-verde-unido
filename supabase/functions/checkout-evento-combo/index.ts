// Cria checkout Asaas único combinando ingressos + produtos (order bump),
// mas mantém ingressos e pedidos_produtos como entidades separadas
// (comprovantes continuam independentes).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, createCheckout } from "../_shared/asaas.ts";

const BodySchema = z.object({
  ingresso_ids: z.array(z.string().uuid()).min(1).max(20),
  extras: z.array(z.object({
    variacao_id: z.string().uuid(),
    quantidade: z.number().int().min(1).max(50),
  })).min(1).max(20),
  forma_pagamento: z.enum(["pix", "credit_card"]),
  parcelas: z.number().int().min(1).max(12).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: "Sessão inválida" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const user = userData.user;

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return new Response(JSON.stringify({
      error: "Body inválido", detalhes: parsed.error.flatten().fieldErrors,
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = parsed.data;
    const parcelasReq = Math.max(1, Math.min(Number(body.parcelas) || 1, 12));
    const isParcelado = body.forma_pagamento === "credit_card" && parcelasReq > 1;

    // ============= INGRESSOS =============
    const { data: ingressosRaw, error: ingErr } = await admin
      .from("ingressos")
      .select("id, user_id, evento_id, status, tipo_ingresso, nome_participante, cortesia, eventos:evento_id(id,titulo,preco,preco_parcelado,max_parcelas,preco_meia,preco_meia_parcelado)")
      .in("id", body.ingresso_ids);

    const ingressos = (ingressosRaw || []).filter((i: any) => i.cortesia !== true && i.status !== "pago");
    if (ingErr || ingressos.length === 0) return new Response(JSON.stringify({ error: "Ingressos não encontrados" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    if (ingressos.some((i: any) => i.user_id !== user.id)) return new Response(JSON.stringify({ error: "Ingressos não pertencem ao usuário" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const eventoId = ingressos[0].evento_id;
    if (ingressos.some((i: any) => i.evento_id !== eventoId)) return new Response(JSON.stringify({ error: "Ingressos de eventos diferentes" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const evento: any = ingressos[0].eventos;

    let maxParcelasAllowed = Math.max(1, evento.max_parcelas || 1);

    const ingressoItems: { description: string; value: number; ingresso_id: string }[] = [];
    let qtdMeia = 0;
    for (const ing of ingressos as any[]) {
      const isMeia = ing.tipo_ingresso === "meia";
      if (isMeia) qtdMeia++;
      const preco = isParcelado
        ? (isMeia ? Number(evento.preco_meia_parcelado) : Number(evento.preco_parcelado))
        : (isMeia ? Number(evento.preco_meia) : Number(evento.preco));
      ingressoItems.push({
        description: `${evento.titulo} — ${ing.nome_participante || "Ingresso"}${isMeia ? " (meia)" : ""}`,
        value: isFinite(preco) ? preco : 0,
        ingresso_id: ing.id,
      });
    }

    // Recheck cota de meias
    if (qtdMeia > 0) {
      const { data: cotaRows } = await admin.rpc("contar_meias_evento", { p_evento_id: eventoId });
      const cota = cotaRows?.[0];
      if (cota && cota.meias_vendidas > cota.vagas_meia_total) {
        return new Response(JSON.stringify({ error: "cota_meia_esgotada", message: `Cota de meia-entrada esgotada.` }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ============= EXTRAS (produtos) =============
    const variacaoIds = body.extras.map((e) => e.variacao_id);
    const { data: variacoes, error: vErr } = await admin
      .from("produto_variacoes")
      .select("id, nome, preco, preco_parcelado, max_parcelas, ativo, produto_id, produtos:produto_id(id,nome,ativo)")
      .in("id", variacaoIds);
    if (vErr || !variacoes || variacoes.length === 0) return new Response(JSON.stringify({ error: "Variações não encontradas" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const varMap = new Map<string, any>(variacoes.map((v: any) => [v.id, v]));

    const extraItems: { description: string; quantity: number; value: number; variacao_id: string; produto_id: string; preco_unit: number }[] = [];
    for (const ex of body.extras) {
      const v = varMap.get(ex.variacao_id);
      if (!v || !v.ativo || !v.produtos?.ativo) {
        return new Response(JSON.stringify({ error: `Produto/variação inativo: ${ex.variacao_id}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Estoque
      const { data: estRow } = await admin.rpc("contar_estoque_produto", { p_variacao_id: ex.variacao_id });
      const est = Array.isArray(estRow) ? estRow[0] : estRow;
      if (est?.disponivel !== null && est?.disponivel !== undefined && est.disponivel < ex.quantidade) {
        return new Response(JSON.stringify({ error: `Estoque insuficiente para ${v.produtos?.nome} - ${v.nome}` }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const preco = isParcelado ? Number(v.preco_parcelado || v.preco) : Number(v.preco);
      maxParcelasGlobal = Math.min(maxParcelasGlobal, v.max_parcelas || 1);
      extraItems.push({
        description: `${v.produtos.nome} - ${v.nome}`,
        quantity: ex.quantidade,
        value: preco,
        variacao_id: ex.variacao_id,
        produto_id: v.produto_id,
        preco_unit: preco,
      });
    }

    const maxParcelas = isParcelado ? Math.max(1, maxParcelasGlobal) : 1;

    // ============= Comprador =============
    const { data: compradorRows, error: compErr } = await admin.rpc("get_comprador_dados", { p_user_id: user.id });
    if (compErr || !compradorRows || compradorRows.length === 0) return new Response(JSON.stringify({ error: "Comprador sem dados" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const comprador = compradorRows[0];
    if (!comprador.cpf || !comprador.nome) return new Response(JSON.stringify({ error: "Comprador sem CPF/nome" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const customer = await getOrCreateCustomer({
      name: comprador.nome, cpfCnpj: comprador.cpf,
      email: comprador.email || user.email || undefined,
      mobilePhone: comprador.celular || undefined,
    });

    // ============= Cria pedidos_produtos pendentes =============
    const pedidoIds: string[] = [];
    for (const li of extraItems) {
      const { data: pedido, error: pErr } = await admin.from("pedidos_produtos").insert({
        user_id: user.id,
        evento_id: eventoId,
        produto_id: li.produto_id,
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
      }).select("id").single();
      if (pErr) {
        console.error("[combo] insert pedido falhou", pErr);
        return new Response(JSON.stringify({ error: pErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      pedidoIds.push(pedido.id);
    }

    // ============= Asaas =============
    const SITE_BASE = "https://colegiozampieri.com.br";
    const successUrl = `${SITE_BASE}/eventos/sucesso?tipo=combo&evento=${eventoId}`;
    const cancelUrl = `${SITE_BASE}/eventos/meus-ingressos?status=cancel`;
    const expiredUrl = `${SITE_BASE}/eventos/meus-ingressos?status=expired`;

    const billingTypes = isParcelado ? (["CREDIT_CARD"] as const) : (["PIX", "CREDIT_CARD"] as const);
    const chargeTypes = isParcelado ? (["DETACHED", "INSTALLMENT"] as const) : (["DETACHED"] as const);

    const items = [
      ...ingressoItems.map((i) => ({ name: i.description, description: i.description, quantity: 1, value: i.value })),
      ...extraItems.map((i) => ({ name: i.description, description: i.description, quantity: i.quantity, value: i.preco_unit })),
    ];

    // externalReference: mix:ing=...;prod=...
    const externalReference = `mix:ing=${ingressos.map((i: any) => i.id).join(",")};prod=${pedidoIds.join(",")}`;

    const checkout = await createCheckout({
      customer: customer.id,
      billingTypes: billingTypes as any,
      chargeTypes: chargeTypes as any,
      items,
      successUrl, cancelUrl, expiredUrl,
      externalReference,
      minutesToExpire: 60,
      maxInstallmentCount: isParcelado ? maxParcelas : undefined,
    });
    const checkoutUrl = checkout.link || checkout.url || checkout.checkoutUrl;
    const checkoutId = checkout.id;

    // Grava nos ingressos
    for (const it of ingressoItems) {
      await admin.from("ingressos").update({
        asaas_customer_id: customer.id,
        checkout_url: checkoutUrl,
        checkout_id: checkoutId,
        checkout_criado_em: new Date().toISOString(),
        forma_pagamento: body.forma_pagamento,
        parcelas: isParcelado ? maxParcelas : 1,
        valor_total: it.value,
        tipo_comprador: comprador.origem === "externo" ? "externo" : "aluno",
      }).eq("id", it.ingresso_id);
    }

    // Grava nos pedidos
    await admin.from("pedidos_produtos").update({
      checkout_url: checkoutUrl,
      checkout_id: checkoutId,
      checkout_criado_em: new Date().toISOString(),
    }).in("id", pedidoIds);

    const valorTotal = items.reduce((s, i) => s + i.value * i.quantity, 0);

    return new Response(JSON.stringify({
      checkout_url: checkoutUrl,
      checkout_id: checkoutId,
      pedido_ids: pedidoIds,
      valor_total: Number(valorTotal.toFixed(2)),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[checkout-evento-combo]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
