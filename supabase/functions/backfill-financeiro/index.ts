import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { recomputeIngressosFinancials, resolveIngressosFromAsaas } from "../_shared/financeiro.ts";
import { getCheckout, listPayments } from "../_shared/asaas.ts";

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

    // Lê body opcional: { force: true } recalcula também ingressos com valor_liquido já preenchido
    let force = false;
    try {
      const body = await req.json();
      if (body?.force === true) force = true;
    } catch (_) { /* sem body */ }

    let processados = 0;
    let erros = 0;
    const detalhes: any[] = [];

    // 1) Ingressos pagos não-cortesia (sem líquido OU todos, se force)
    let q = admin
      .from("ingressos")
      .select("id, checkout_id, asaas_payment_id, cortesia")
      .eq("status", "pago")
      .eq("cortesia", false);
    if (!force) q = q.is("valor_liquido", null);
    const { data: pendentes, error } = await q.limit(2000);
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
        let stableId = g.stableId || "";
        let resolvedPaymentId: string | null = null;
        let resolvedInstallmentId: string | null = null;

        // Se não temos stableId, tenta resolver via webhook events (PAYMENT_*) com checkoutSession = checkoutId
        if (!stableId) {
          const { data: evs } = await admin
            .from("asaas_webhook_events")
            .select("payload, payment_id")
            .in("event_type", ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH", "PAYMENT_CREATED"])
            .order("created_at", { ascending: false })
            .limit(1000);
          for (const ev of evs || []) {
            const cs = ev.payload?.payment?.checkoutSession;
            if (cs !== checkoutId) continue;
            const inst = ev.payload?.payment?.installment || null;
            const pid = ev.payload?.payment?.id || ev.payment_id || null;
            if (inst) { resolvedInstallmentId = inst; break; }
            if (pid && !resolvedPaymentId) resolvedPaymentId = pid;
          }
          stableId = resolvedInstallmentId || resolvedPaymentId || "";
        }

        // Fallback: consulta a API do Asaas pelo checkoutId
        if (!stableId) {
          // 1) Tenta GET /checkouts/{id}
          try {
            const ck = await getCheckout(checkoutId);
            const ckPaymentId = ck?.payment?.id || (typeof ck?.payment === "string" ? ck.payment : null);
            const ckInstallmentId = ck?.installment?.id || (typeof ck?.installment === "string" ? ck.installment : null);
            if (ckInstallmentId) { resolvedInstallmentId = ckInstallmentId; stableId = ckInstallmentId; }
            else if (ckPaymentId) { resolvedPaymentId = ckPaymentId; stableId = ckPaymentId; }
          } catch (e) {
            console.warn("[backfill] getCheckout falhou", checkoutId, (e as Error).message);
          }
          // 2) Lista pagamentos via filtros conhecidos do Asaas
          if (!stableId) {
            const filtros: Record<string, any>[] = [
              { checkoutSession: checkoutId },
              { "checkout[in]": checkoutId },
              { checkout: checkoutId },
            ];
            for (const f of filtros) {
              try {
                const lp = await listPayments({ ...f, limit: 100 } as any);
                const pays = lp?.data || [];
                if (pays.length > 0) {
                  const inst = pays.find((p: any) => p.installment)?.installment || null;
                  if (inst) { resolvedInstallmentId = inst; stableId = inst; }
                  else { resolvedPaymentId = pays[0].id; stableId = pays[0].id; }
                  break;
                }
              } catch (e) {
                console.warn("[backfill] listPayments falhou", JSON.stringify(f), (e as Error).message);
              }
            }
          }
        }

        const isInstallment = !!resolvedInstallmentId || (stableId && !stableId.startsWith("pay_"));
        const isPayment = !resolvedInstallmentId && stableId && stableId.startsWith("pay_");

        const res = await recomputeIngressosFinancials(admin, {
          checkoutId,
          paymentId: isPayment ? stableId : null,
          installmentId: isInstallment ? (resolvedInstallmentId || stableId) : null,
          ingressoIds: g.ids,
        });
        if ((res as any).updated > 0) processados += (res as any).updated;
        else detalhes.push({ checkoutId, motivo: (res as any).reason, stableId });
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
