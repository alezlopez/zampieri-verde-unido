// Backfill de produtos: agora delega para a mesma lógica unificada do
// backfill-financeiro (rateio por checkout). Mantido como endpoint separado
// apenas para compatibilidade com a tela /produtos/relatorio.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import {
  aplicarRateioCheckout,
  loadPaymentsByCheckout,
  preloadWebhookCacheByCheckout,
} from "../_shared/checkout-rateio.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    // Coleta checkouts de produtos pagos
    const targetCheckouts = new Set<string>();
    let qProd = admin
      .from("pedidos_produtos")
      .select("checkout_id")
      .in("status", ["pago", "retirado"])
      .not("checkout_id", "is", null);
    if (!force) qProd = qProd.is("valor_liquido", null);
    const { data: prods, error } = await qProd.limit(5000);
    if (error) throw error;
    for (const r of prods || []) if ((r as any).checkout_id) targetCheckouts.add((r as any).checkout_id);

    if (targetCheckouts.size === 0) {
      return new Response(JSON.stringify({ ok: true, total: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cache = await preloadWebhookCacheByCheckout(admin);

    let processados = 0;
    let ingressosAtualizados = 0;
    let produtosAtualizados = 0;
    let semPagamento = 0;
    let erros = 0;
    let apiFallbacks = 0;
    const MAX_FB = 50;
    const detalhes: any[] = [];

    for (const checkoutId of targetCheckouts) {
      try {
        const hadCache = cache.has(checkoutId);
        const totals = await loadPaymentsByCheckout(admin, checkoutId, {
          allowApiFallback: apiFallbacks < MAX_FB,
          webhookCache: cache,
        });
        if (!hadCache) { apiFallbacks++; await sleep(200); }
        if (!totals) { semPagamento++; continue; }
        const res = await aplicarRateioCheckout(admin, checkoutId, totals);
        processados++;
        ingressosAtualizados += res.ingressosUpd;
        produtosAtualizados += res.produtosUpd;
      } catch (e: any) {
        erros++;
        if (detalhes.length < 20) detalhes.push({ checkoutId, erro: e.message });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      total: targetCheckouts.size,
      processados,
      ingressos_atualizados: ingressosAtualizados,
      produtos_atualizados: produtosAtualizados,
      sem_pagamento: semPagamento,
      erros,
      api_fallbacks_usados: apiFallbacks,
      detalhes,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[backfill-produtos-financeiro]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
