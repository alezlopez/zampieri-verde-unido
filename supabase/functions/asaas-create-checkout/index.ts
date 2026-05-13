import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, createCheckout } from "../_shared/asaas.ts";

const BodySchema = z.object({
  ingresso_ids: z.array(z.string().uuid()).min(1).max(20),
  forma_pagamento: z.enum(["pix", "credit_card"]),
  parcelas: z.number().int().min(1).max(12).optional(),
});

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
      return new Response(JSON.stringify({
        error: "Body inválido",
        detalhes: parsed.error.flatten().fieldErrors,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = parsed.data;
    const parcelasReq = Math.max(1, Math.min(Number(body.parcelas) || 1, 12));

    // Carrega ingressos + evento (inclui preços de meia)
    const { data: ingressosRaw, error: ingErr } = await admin
      .from("ingressos")
      .select("id, user_id, evento_id, asaas_payment_id, checkout_url, status, tipo_ingresso, nome_participante, cortesia, eventos:evento_id(id,titulo,preco,preco_parcelado,max_parcelas,preco_meia,preco_meia_parcelado)")
      .in("id", body.ingresso_ids);

    // Defesa: ignora ingressos cortesia ou já pagos
    const ingressos = (ingressosRaw || []).filter((i: any) => i.cortesia !== true && i.status !== "pago");

    if (ingErr || !ingressos || ingressos.length === 0) {
      return new Response(JSON.stringify({ error: "Ingressos não encontrados" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ingressos.some((i: any) => i.user_id !== user.id)) {
      return new Response(JSON.stringify({ error: "Ingressos não pertencem ao usuário" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência: se já tem checkout gerado, reutiliza
    const existing = ingressos.find((i: any) => i.checkout_url);
    if (existing) {
      return new Response(JSON.stringify({
        checkout_url: existing.checkout_url,
        reused: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const eventoId = ingressos[0].evento_id;
    if (ingressos.some((i: any) => i.evento_id !== eventoId)) {
      return new Response(JSON.stringify({ error: "Ingressos de eventos diferentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const evento: any = ingressos[0].eventos;

    const isParcelado = body.forma_pagamento === "credit_card" && parcelasReq > 1;
    const maxParcelas = Math.max(1, Math.min(parcelasReq, evento.max_parcelas || 1));

    // Recalcula preço por ingresso usando tipo_ingresso (defesa contra preço enviado pelo cliente)
    let qtdInteira = 0, qtdMeia = 0;
    let valorTotal = 0;
    const items: { description: string; quantity: number; value: number; ingresso_id: string }[] = [];
    for (const ing of ingressos as any[]) {
      const isMeia = ing.tipo_ingresso === "meia";
      if (isMeia) qtdMeia++; else qtdInteira++;
      const preco = isParcelado
        ? (isMeia ? Number(evento.preco_meia_parcelado) : Number(evento.preco_parcelado))
        : (isMeia ? Number(evento.preco_meia) : Number(evento.preco));
      const valor = isFinite(preco) ? preco : 0;
      valorTotal += valor;
      items.push({
        description: `${evento.titulo} — ${ing.nome_participante || "Ingresso"}${isMeia ? " (meia)" : ""}`,
        quantity: 1,
        value: valor,
        ingresso_id: ing.id,
      });
    }

    valorTotal = Number(valorTotal.toFixed(2));
    if (valorTotal <= 0) {
      return new Response(JSON.stringify({ error: "Valor total inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recheck cota de meias (race entre carrinhos diferentes)
    if (qtdMeia > 0) {
      const { data: cotaRows } = await admin.rpc("contar_meias_evento", { p_evento_id: eventoId });
      const cota = cotaRows?.[0];
      if (cota && cota.meias_vendidas > cota.vagas_meia_total) {
        return new Response(JSON.stringify({
          error: "cota_meia_esgotada",
          message: `Cota de meia-entrada esgotada. ${cota.meias_disponiveis} disponíveis.`,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Comprador
    const { data: compradorRows, error: compErr } = await admin.rpc("get_comprador_dados", {
      p_user_id: user.id,
    });
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

    

    console.log("[asaas-create-checkout]", {
      evento_id: eventoId, qtd_inteira: qtdInteira, qtd_meia: qtdMeia,
      valor_total: valorTotal, parcelado: isParcelado, parcelas: maxParcelas,
    });

    const SITE_BASE = "https://colegiozampieri.com.br";
    const successUrl = `${SITE_BASE}/eventos/meus-ingressos?status=success`;
    const cancelUrl = `${SITE_BASE}/eventos/meus-ingressos?status=cancel`;
    const expiredUrl = `${SITE_BASE}/eventos/meus-ingressos?status=expired`;

    const billingTypes = isParcelado
      ? (["CREDIT_CARD"] as const)
      : (["PIX", "CREDIT_CARD"] as const);
    const chargeTypes = isParcelado
      ? (["DETACHED", "INSTALLMENT"] as const)
      : (["DETACHED"] as const);

    const checkout = await createCheckout({
      customer: customer.id,
      billingTypes: billingTypes as any,
      chargeTypes: chargeTypes as any,
      items: items.map((i) => ({ name: i.description, description: i.description, quantity: i.quantity, value: i.value })),
      successUrl,
      cancelUrl,
      expiredUrl,
      externalReference: ingressos.map((i: any) => i.id).join(","),
      minutesToExpire: 1440,
      maxInstallmentCount: isParcelado ? maxParcelas : undefined,
    });

    const checkoutUrl = checkout.link || checkout.url || checkout.checkoutUrl;
    const checkoutId = checkout.id;

    // Atualiza por ingresso para gravar o valor unitário correto em valor_total
    for (const it of items) {
      await admin
        .from("ingressos")
        .update({
          asaas_customer_id: customer.id,
          checkout_url: checkoutUrl,
          checkout_id: checkoutId,
          forma_pagamento: body.forma_pagamento,
          parcelas: isParcelado ? maxParcelas : 1,
          valor_total: it.value,
          tipo_comprador: comprador.origem === "externo" ? "externo" : "aluno",
        })
        .eq("id", it.ingresso_id);
    }

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl, checkout_id: checkoutId, reused: false, valor_total: valorTotal }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[asaas-create-checkout]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
