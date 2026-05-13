import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { recomputePedidosProdutos } from "../_shared/produtos-financeiro.ts";

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
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let force = false;
    try { const body = await req.json(); if (body?.force === true) force = true; } catch (_) { /* */ }

    let q = admin
      .from("pedidos_produtos")
      .select("id, checkout_id, asaas_payment_id")
      .eq("status", "pago");
    if (!force) q = q.is("valor_liquido", null);
    const { data: pendentes, error } = await q.limit(2000);
    if (error) throw error;
    const total = pendentes?.length || 0;

    const porCheckout = new Map<string, { ids: string[]; stableId: string | null }>();
    const porPayment = new Map<string, string[]>();
    for (const p of pendentes || []) {
      if (p.checkout_id) {
        if (!porCheckout.has(p.checkout_id)) porCheckout.set(p.checkout_id, { ids: [], stableId: p.asaas_payment_id });
        const g = porCheckout.get(p.checkout_id)!;
        g.ids.push(p.id);
        if (!g.stableId && p.asaas_payment_id) g.stableId = p.asaas_payment_id;
      } else if (p.asaas_payment_id) {
        if (!porPayment.has(p.asaas_payment_id)) porPayment.set(p.asaas_payment_id, []);
        porPayment.get(p.asaas_payment_id)!.push(p.id);
      }
    }

    let processados = 0;
    let erros = 0;
    const detalhes: any[] = [];

    for (const [checkoutId, g] of porCheckout) {
      try {
        const stableId = g.stableId || "";
        const isInstallment = !!stableId && !stableId.startsWith("pay_");
        const isPayment = !!stableId && stableId.startsWith("pay_");
        const res = await recomputePedidosProdutos(admin, {
          checkoutId,
          paymentId: isPayment ? stableId : null,
          installmentId: isInstallment ? stableId : null,
          pedidoIds: g.ids,
        });
        if ((res as any).updated > 0) processados += (res as any).updated;
        else detalhes.push({ checkoutId, motivo: "sem_pagamento" });
      } catch (e: any) {
        erros += g.ids.length;
        detalhes.push({ checkoutId, erro: e.message });
      }
    }

    for (const [stableId, ids] of porPayment) {
      try {
        const isInstallment = !stableId.startsWith("pay_");
        const isPayment = stableId.startsWith("pay_");
        const res = await recomputePedidosProdutos(admin, {
          paymentId: isPayment ? stableId : null,
          installmentId: isInstallment ? stableId : null,
          pedidoIds: ids,
        });
        if ((res as any).updated > 0) processados += (res as any).updated;
        else detalhes.push({ stableId, motivo: "sem_pagamento" });
      } catch (e: any) {
        erros += ids.length;
        detalhes.push({ stableId, erro: e.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, total, processados, erros, detalhes: detalhes.slice(0, 20) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[backfill-produtos-financeiro]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
