import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const STATUS_MAP: Record<string, string> = {
  PAYMENT_CONFIRMED: "pago",
  PAYMENT_RECEIVED: "pago",
  PAYMENT_RECEIVED_IN_CASH: "pago",
  PAYMENT_OVERDUE: "pendente",
  PAYMENT_REFUNDED: "estornado",
  PAYMENT_REFUND_IN_PROGRESS: "estornado",
  PAYMENT_DELETED: "estornado",
  PAYMENT_CHARGEBACK_REQUESTED: "cancelado",
  PAYMENT_CHARGEBACK_DISPUTE: "cancelado",
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: "cancelado",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Validar token Asaas
  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";
  const got = req.headers.get("asaas-access-token") || "";
  if (!expected || got !== expected) {
    console.warn("[asaas-webhook] token inválido");
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId: string = payload?.id || `${payload?.event}-${payload?.payment?.id}-${Date.now()}`;
  const eventType: string = payload?.event || "UNKNOWN";
  const paymentId: string | null = payload?.payment?.id || null;

  // Idempotência
  const { error: insErr } = await admin.from("asaas_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    payment_id: paymentId,
    payload,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      // Duplicado: ok
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[asaas-webhook] insert event failed", insErr);
  }

  try {
    const newStatus = STATUS_MAP[eventType];
    const externalRef: string | null = payload?.payment?.externalReference || null;

    if (newStatus && paymentId) {
      const update: any = { status: newStatus, asaas_payment_id: paymentId };
      if (newStatus === "pago") update.utilizado = false;

      // 1) Tenta casar pelo asaas_payment_id (caso já tenha sido salvo antes)
      let { data: matched, error: updErr } = await admin
        .from("ingressos")
        .update(update)
        .eq("asaas_payment_id", paymentId)
        .select("id");
      if (updErr) throw updErr;

      // 2) Fallback: casar pelos ids vindos no externalReference (Asaas Checkout)
      if ((!matched || matched.length === 0) && externalRef) {
        const ids = externalRef.split(",").map((s) => s.trim()).filter(Boolean);
        if (ids.length > 0) {
          const r = await admin
            .from("ingressos")
            .update(update)
            .in("id", ids)
            .select("id");
          if (r.error) throw r.error;
          matched = r.data;
        }
      }

      // Dispara e-mail de confirmação (best-effort, não bloqueia webhook)
      if (newStatus === "pago" && matched && matched.length > 0) {
        admin.functions.invoke("enviar-confirmacao-ingresso", {
          body: { payment_id: paymentId },
        }).catch((e) => console.error("[asaas-webhook] envio email falhou", e));
      }
    }

    await admin
      .from("asaas_webhook_events")
      .update({ processed: true })
      .eq("event_id", eventId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[asaas-webhook] processing error", e);
    await admin
      .from("asaas_webhook_events")
      .update({ error: e.message || String(e) })
      .eq("event_id", eventId);
    // Sempre 200 para não disparar retries infinitos
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
