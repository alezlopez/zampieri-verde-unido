import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { recomputeIngressosFinancials, resolveIngressosFromAsaas } from "../_shared/financeiro.ts";

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

    let processados = 0;
    let erros = 0;
    const detalhes: any[] = [];

    // 1) Ingressos pagos não-cortesia sem valor_liquido
    const { data: pendentes, error } = await admin
      .from("ingressos")
      .select("id, checkout_id, asaas_payment_id, cortesia")
      .eq("status", "pago")
      .eq("cortesia", false)
      .is("valor_liquido", null)
      .limit(1000);
    if (error) throw error;
    const total = pendentes?.length || 0;

    // Agrupa primeiro por checkout_id (vínculo mais forte), depois por asaas_payment_id
    const porCheckout = new Map<string, { ids: string[]; stableId: string | null }>();
    const porPayment = new Map<string, { ids: string[]; checkoutId: string | null }>();
    const semChave: any[] = [];

    for (const p of pendentes || []) {
      if (p.checkout_id) {
        if (!porCheckout.has(p.checkout_id)) {
          porCheckout.set(p.checkout_id, { ids: [], stableId: p.asaas_payment_id });
        }
        const g = porCheckout.get(p.checkout_id)!;
        g.ids.push(p.id);
        if (!g.stableId && p.asaas_payment_id) g.stableId = p.asaas_payment_id;
      } else if (p.asaas_payment_id) {
        if (!porPayment.has(p.asaas_payment_id)) {
          porPayment.set(p.asaas_payment_id, { ids: [], checkoutId: null });
        }
        porPayment.get(p.asaas_payment_id)!.ids.push(p.id);
      } else {
        semChave.push(p);
      }
    }

    // Processa grupos por checkout_id
    for (const [checkoutId, g] of porCheckout) {
      try {
        const stableId = g.stableId || "";
        const isInstallment = stableId && !stableId.startsWith("pay_");
        const isPayment = stableId && stableId.startsWith("pay_");
        const res = await recomputeIngressosFinancials(admin, {
          checkoutId,
          paymentId: isPayment ? stableId : null,
          installmentId: isInstallment ? stableId : null,
          ingressoIds: g.ids,
        });
        if ((res as any).updated > 0) processados += (res as any).updated;
        else detalhes.push({ checkoutId, motivo: (res as any).reason });
      } catch (e: any) {
        console.error("[backfill] erro checkout", checkoutId, e);
        erros += g.ids.length;
        detalhes.push({ checkoutId, erro: e.message });
      }
    }

    // Processa grupos só com asaas_payment_id
    for (const [stableId, g] of porPayment) {
      try {
        const isInstallment = !stableId.startsWith("pay_");
        const isPayment = stableId.startsWith("pay_");
        const res = await recomputeIngressosFinancials(admin, {
          paymentId: isPayment ? stableId : null,
          installmentId: isInstallment ? stableId : null,
          ingressoIds: g.ids,
        });
        if ((res as any).updated > 0) processados += (res as any).updated;
        else detalhes.push({ stableId, motivo: (res as any).reason });
      } catch (e: any) {
        console.error("[backfill] erro payment", stableId, e);
        erros += g.ids.length;
        detalhes.push({ stableId, erro: e.message });
      }
    }

    // 2) Ingressos sem chave: tenta resolver via webhook events recentes
    if (semChave.length > 0) {
      const { data: events } = await admin
        .from("asaas_webhook_events")
        .select("payload, payment_id")
        .in("event_type", ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH"])
        .order("created_at", { ascending: false })
        .limit(500);

      const vistos = new Set<string>();
      const ingressoIdsAlvo = new Set(semChave.map((p: any) => p.id));

      for (const ev of events || []) {
        const pid = ev.payload?.payment?.id || ev.payment_id;
        const inst = ev.payload?.payment?.installment || null;
        const ckSession = ev.payload?.payment?.checkoutSession || null;
        const chave = inst || pid;
        if (!chave || vistos.has(chave)) continue;
        vistos.add(chave);

        try {
          const { ingressoIds } = await resolveIngressosFromAsaas({ paymentId: pid, installmentId: inst });

          // Tenta também pelo checkout session
          let resolvedIds = ingressoIds;
          if ((!resolvedIds || resolvedIds.length === 0) && ckSession) {
            const { data: ingsCk } = await admin
              .from("ingressos")
              .select("id")
              .eq("checkout_id", ckSession);
            resolvedIds = (ingsCk || []).map((r: any) => r.id);
          }

          const intersect = (resolvedIds || []).filter((id) => ingressoIdsAlvo.has(id));
          if (intersect.length === 0) continue;

          await recomputeIngressosFinancials(admin, {
            checkoutId: ckSession,
            paymentId: inst ? null : pid,
            installmentId: inst,
            ingressoIds: resolvedIds,
          });
          processados += intersect.length;
        } catch (e: any) {
          console.error("[backfill] erro webhook resolve", chave, e);
          detalhes.push({ chave, erro: e.message });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, total, processados, erros, detalhes: detalhes.slice(0, 20) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[backfill-financeiro]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
