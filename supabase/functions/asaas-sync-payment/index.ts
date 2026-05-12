import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getPayment } from "../_shared/asaas.ts";

const STATUS_MAP: Record<string, string> = {
  CONFIRMED: "pago",
  RECEIVED: "pago",
  RECEIVED_IN_CASH: "pago",
  PENDING: "pendente",
  AWAITING_RISK_ANALYSIS: "pendente",
  OVERDUE: "pendente",
  REFUNDED: "estornado",
  REFUND_IN_PROGRESS: "estornado",
  REFUND_REQUESTED: "estornado",
  CHARGEBACK_REQUESTED: "cancelado",
  CHARGEBACK_DISPUTE: "cancelado",
  DELETED: "estornado",
};

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

    // Admin only
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let paymentId: string | null = body?.payment_id || null;
    if (!paymentId && body?.ingresso_id) {
      const { data: ing } = await admin
        .from("ingressos")
        .select("asaas_payment_id")
        .eq("id", body.ingresso_id)
        .maybeSingle();
      paymentId = ing?.asaas_payment_id || null;
    }
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "payment_id ausente" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await getPayment(paymentId);
    const newStatus = STATUS_MAP[payment.status] || null;

    if (newStatus) {
      await admin
        .from("ingressos")
        .update({ status: newStatus })
        .eq("asaas_payment_id", paymentId);
    }

    return new Response(JSON.stringify({ ok: true, asaas_status: payment.status, mapped: newStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[asaas-sync-payment]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
