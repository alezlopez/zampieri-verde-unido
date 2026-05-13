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
    let total = 0;
    const detalhes: any[] = [];

    // 1) Caminho A: ingressos pagos sem valor_liquido com asaas_payment_id ou checkout_id
    const { data: pendentes, error } = await admin
      .from("ingressos")
      .select("id, checkout_id, asaas_payment_id, cortesia")
      .eq("status", "pago")
      .eq("cortesia", false)
      .is("valor_liquido", null)
      .limit(1000);
    if (error) throw error;
    total = pendentes?.length || 0;

    // Agrupa por (asaas_payment_id || checkout_id)
    const grupos = new Map<string, { checkoutId: string | null; stableId: string | null; ids: string[] }>();
    const semChave: any[] = [];
    for (const p of pendentes || []) {
      const key = p.asaas_payment_id || p.checkout_id;
      if (!key) { semChave.push(p); continue; }
      if (!grupos.has(key)) {
        grupos.set(key, { checkoutId: p.checkout_id, stableId: p.asaas_payment_id, ids: [] });
      }
      grupos.get(key)!.ids.push(p.id);
    }

    for (const [, g] of grupos) {
      try {
        const stableId = g.stableId || "";
        // Heurística: ids de pagamento Asaas começam com "pay_"; installment é uuid puro
        const isInstallment = stableId && !stableId.startsWith("pay_");
        const isPayment = stableId && stableId.startsWith("pay_");
        await recomputeIngressosFinancials(admin, {
          checkoutId: g.checkoutId,
          paymentId: isPayment ? stableId : null,
          installmentId: isInstallment ? stableId : null,
          ingressoIds: g.ids,
        });
        processados += g.ids.length;
      } catch (e: any) {
        console.error("[backfill] erro grupo", g, e);
        erros += g.ids.length;
        detalhes.push({ grupo: g, erro: e.message });
      }
    }

    // 2) Caminho B: ingressos sem stableId nem checkout_id usável.
    // Varremos webhook events para tentar reconstruir o vínculo.
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
        const chave = inst || pid;
        if (!chave || vistos.has(chave)) continue;
        vistos.add(chave);

        try {
          const { ingressoIds } = await resolveIngressosFromAsaas({ paymentId: pid, installmentId: inst });
          const intersect = ingressoIds.filter((id) => ingressoIdsAlvo.has(id));
          if (intersect.length === 0) continue;
          await recomputeIngressosFinancials(admin, {
            paymentId: inst ? null : pid,
            installmentId: inst,
            ingressoIds,
          });
          processados += intersect.length;
        } catch (e: any) {
          console.error("[backfill] erro webhook resolve", chave, e);
          detalhes.push({ chave, erro: e.message });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, total, processados, erros, detalhes: detalhes.slice(0, 10) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[backfill-financeiro]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
