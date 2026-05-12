import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, createPayment } from "../_shared/asaas.ts";

interface Body {
  ingresso_ids: string[];
  forma_pagamento: "pix" | "credit_card";
  parcelas?: number;
}

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

    const body = (await req.json()) as Body;
    if (!Array.isArray(body.ingresso_ids) || body.ingresso_ids.length === 0) {
      return new Response(JSON.stringify({ error: "ingresso_ids vazio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["pix", "credit_card"].includes(body.forma_pagamento)) {
      return new Response(JSON.stringify({ error: "forma_pagamento inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega ingressos + evento
    const { data: ingressos, error: ingErr } = await admin
      .from("ingressos")
      .select("id, user_id, evento_id, asaas_payment_id, checkout_url, status, eventos:evento_id(id,titulo,preco,preco_parcelado,max_parcelas)")
      .in("id", body.ingresso_ids);

    if (ingErr || !ingressos || ingressos.length === 0) {
      return new Response(JSON.stringify({ error: "Ingressos não encontrados" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership
    if (ingressos.some((i: any) => i.user_id !== user.id)) {
      return new Response(JSON.stringify({ error: "Ingressos não pertencem ao usuário" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência: se já existe payment_id, devolve checkout existente
    const existing = ingressos.find((i: any) => i.asaas_payment_id && i.checkout_url);
    if (existing) {
      return new Response(JSON.stringify({
        checkout_url: existing.checkout_url,
        payment_id: existing.asaas_payment_id,
        reused: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mesmo evento
    const eventoId = ingressos[0].evento_id;
    if (ingressos.some((i: any) => i.evento_id !== eventoId)) {
      return new Response(JSON.stringify({ error: "Ingressos de eventos diferentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const evento: any = ingressos[0].eventos;
    const qtd = ingressos.length;

    const isParcelado = body.forma_pagamento === "credit_card" && (body.parcelas || 1) > 1;
    const maxParcelas = Math.max(1, Math.min(body.parcelas || 1, evento.max_parcelas || 1));
    const precoUnit = isParcelado && evento.preco_parcelado > 0 ? evento.preco_parcelado : evento.preco;
    const valorTotal = Number((precoUnit * qtd).toFixed(2));

    // Resolve dados do comprador (aluno OU externo)
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

    // Customer Asaas
    const customer = await getOrCreateCustomer({
      name: comprador.nome,
      cpfCnpj: comprador.cpf,
      email: comprador.email || user.email || undefined,
      mobilePhone: comprador.celular || undefined,
    });

    // Cobrança
    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const payment = await createPayment({
      customer: customer.id,
      billingType: body.forma_pagamento === "pix" ? "PIX" : "CREDIT_CARD",
      value: precoUnit,
      totalValue: isParcelado ? valorTotal : undefined,
      installmentCount: isParcelado ? maxParcelas : undefined,
      dueDate,
      description: `${evento.titulo} — ${qtd} ingresso(s)`,
      externalReference: ingressos.map((i: any) => i.id).join(","),
    });

    const checkoutUrl = payment.invoiceUrl || payment.bankSlipUrl;
    const paymentId = payment.id;

    // Persiste
    await admin
      .from("ingressos")
      .update({
        asaas_customer_id: customer.id,
        asaas_payment_id: paymentId,
        checkout_url: checkoutUrl,
        checkout_id: paymentId,
        forma_pagamento: body.forma_pagamento,
        parcelas: isParcelado ? maxParcelas : 1,
        valor_total: valorTotal,
        tipo_comprador: comprador.origem === "externo" ? "externo" : "aluno",
      })
      .in("id", body.ingresso_ids);

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl, payment_id: paymentId, reused: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[asaas-create-checkout]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
