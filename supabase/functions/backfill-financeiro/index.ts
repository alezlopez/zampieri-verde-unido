// Backfill financeiro UNIFICADO (ingressos + produtos).
//
// Estratégia:
// 1) Carrega TODOS os webhooks PAYMENT_* uma vez (1 ou 2 queries).
// 2) Coleta todos os checkout_ids distintos de ingressos pagos não-cortesia
//    e pedidos_produtos pagos/retirados.
// 3) Para cada checkout, calcula totals via webhook cache e aplica rateio
//    entre ingressos e produtos do mesmo checkout (regra única).
// 4) Fallback à API Asaas APENAS para checkouts sem webhook (raros).
//
// Modos:
//   default        -> processa apenas checkouts com ingressos/produtos pagos sem valor_liquido (sincronização leve)
//   { force: true } -> reprocessa todos os checkouts pagos (uso quando a lógica muda)
//
// O endpoint mantém o nome `backfill-financeiro` para compatibilidade com o botão atual.
// Há também `backfill-produtos-financeiro` que delega para esta mesma lógica.
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
    const { data: isAdmin } = await admin.rpc("has_setor", { _user_id: userData.user.id, _setor: "produtos" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let force = false;
    let onlyCheckoutId: string | null = null;
    try {
      const body = await req.json();
      if (body?.force === true) force = true;
      if (body?.checkout_id && typeof body.checkout_id === "string") onlyCheckoutId = body.checkout_id;
    } catch (_) { /* sem body */ }

    // ---------- 1) Coleta dos checkout_ids alvo ----------
    const targetCheckouts = new Set<string>();

    if (onlyCheckoutId) {
      targetCheckouts.add(onlyCheckoutId);
    } else {
      // Ingressos
      let qIng = admin
        .from("ingressos")
        .select("checkout_id")
        .eq("status", "pago")
        .eq("cortesia", false)
        .not("checkout_id", "is", null);
      if (!force) qIng = qIng.is("valor_liquido", null);
      const { data: ings, error: ingErr } = await qIng.limit(5000);
      if (ingErr) throw ingErr;
      for (const r of ings || []) if ((r as any).checkout_id) targetCheckouts.add((r as any).checkout_id);

      // Produtos
      let qProd = admin
        .from("pedidos_produtos")
        .select("checkout_id")
        .in("status", ["pago", "retirado"])
        .not("checkout_id", "is", null);
      if (!force) qProd = qProd.is("valor_liquido", null);
      const { data: prods, error: prErr } = await qProd.limit(5000);
      if (prErr) throw prErr;
      for (const r of prods || []) if ((r as any).checkout_id) targetCheckouts.add((r as any).checkout_id);
    }

    const totalCheckouts = targetCheckouts.size;
    if (totalCheckouts === 0) {
      return new Response(JSON.stringify({ ok: true, total: 0, message: "Nada para processar" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- 2) Pre-carrega webhooks em cache ----------
    const cache = await preloadWebhookCacheByCheckout(admin);

    // ---------- 3) Processa cada checkout ----------
    let processados = 0;
    let ingressosAtualizados = 0;
    let produtosAtualizados = 0;
    let semPagamento = 0;
    let erros = 0;
    const detalhes: any[] = [];
    let apiFallbackCount = 0;
    const MAX_API_FALLBACKS = 50; // proteção anti-429

    for (const checkoutId of targetCheckouts) {
      try {
        const allowApi = apiFallbackCount < MAX_API_FALLBACKS;
        const hadCache = cache.has(checkoutId);
        const totals = await loadPaymentsByCheckout(admin, checkoutId, {
          allowApiFallback: allowApi,
          webhookCache: cache,
        });
        if (!hadCache && allowApi) {
          apiFallbackCount++;
          await sleep(200); // throttle anti-429
        }
        if (!totals) {
          semPagamento++;
          if (detalhes.length < 20) detalhes.push({ checkoutId, motivo: "sem_pagamento_localizado" });
          continue;
        }
        const res = await aplicarRateioCheckout(admin, checkoutId, totals);
        processados++;
        ingressosAtualizados += res.ingressosUpd;
        produtosAtualizados += res.produtosUpd;
      } catch (e: any) {
        erros++;
        console.error("[backfill] erro checkout", checkoutId, e);
        if (detalhes.length < 20) detalhes.push({ checkoutId, erro: e.message || String(e) });
      }
    }

    // ---------- 4) Tratamento dos órfãos (sem checkout_id) ----------
    // Ingressos pagos sem checkout_id mas com asaas_payment_id: tenta resolver via webhook.
    if (!onlyCheckoutId) {
      const { data: orfaos } = await admin
        .from("ingressos")
        .select("id, asaas_payment_id")
        .eq("status", "pago")
        .eq("cortesia", false)
        .is("checkout_id", null)
        .not("asaas_payment_id", "is", null)
        .limit(500);

      for (const o of orfaos || []) {
        const pid = (o as any).asaas_payment_id;
        // Procura no cache de webhooks
        let foundCheckout: string | null = null;
        for (const [ck, pays] of cache.entries()) {
          if (pays.some((p) => p.id === pid || p.installment === pid)) {
            foundCheckout = ck;
            break;
          }
        }
        if (!foundCheckout) continue;
        try {
          await admin.from("ingressos").update({ checkout_id: foundCheckout }).eq("id", (o as any).id);
          if (!targetCheckouts.has(foundCheckout)) {
            const totals = await loadPaymentsByCheckout(admin, foundCheckout, {
              allowApiFallback: false, webhookCache: cache,
            });
            if (totals) {
              const res = await aplicarRateioCheckout(admin, foundCheckout, totals);
              ingressosAtualizados += res.ingressosUpd;
              produtosAtualizados += res.produtosUpd;
            }
          }
        } catch (e: any) {
          erros++;
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      total: totalCheckouts,
      processados,
      ingressos_atualizados: ingressosAtualizados,
      produtos_atualizados: produtosAtualizados,
      sem_pagamento: semPagamento,
      erros,
      api_fallbacks_usados: apiFallbackCount,
      cache_size: cache.size,
      detalhes,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[backfill-financeiro]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
