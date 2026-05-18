// Admin: cancela um ingresso e solicita estorno no Asaas.
// - Cortesia ou sem asaas_payment_id: apenas cancela (status=cancelado).
// - Com pagamento: faz refund em cada parcela paga, delete nas pendentes futuras.
// - Marca status=estornado, motivo, autor, timestamp.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayment, listInstallmentPayments, refundPayment, deletePayment } from "../_shared/asaas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const PENDING = new Set(["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");

    const userClient = createClient(supaUrl, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supaUrl, service);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const tipo = String(body.tipo || ""); // "ingresso" | "pedido"
    const id = String(body.id || "");
    const motivo = String(body.motivo || "").trim();
    if (!id || (tipo !== "ingresso" && tipo !== "pedido")) return json({ error: "invalid_input" }, 400);
    if (motivo.length < 3) return json({ error: "motivo_obrigatorio" }, 400);

    const table = tipo === "ingresso" ? "ingressos" : "pedidos_produtos";
    const { data: row, error: getErr } = await admin
      .from(table)
      .select("id, status, cortesia, asaas_payment_id, valor_total, checkout_id")
      .eq("id", id)
      .maybeSingle();
    if (getErr || !row) return json({ error: "not_found" }, 404);

    if (row.status === "estornado" || row.status === "cancelado") {
      return json({ error: "ja_cancelado", status: row.status }, 400);
    }

    const refunds: any[] = [];
    let comprovanteUrl: string | null = null;

    const isCortesia = tipo === "ingresso" && (row as any).cortesia === true;
    const paymentRef = row.asaas_payment_id as string | null;

    if (!isCortesia && paymentRef) {
      // Resolve lista de pagamentos (installment ou avulso)
      let payments: any[] = [];
      try {
        // tenta como installment primeiro
        const inst = await listInstallmentPayments(paymentRef).catch(() => null);
        if (inst?.data && Array.isArray(inst.data) && inst.data.length > 0) {
          payments = inst.data;
        } else {
          const p = await getPayment(paymentRef);
          if (p?.installment) {
            const d = await listInstallmentPayments(p.installment);
            payments = d?.data || [p];
          } else if (p) {
            payments = [p];
          }
        }
      } catch (e) {
        console.error("[cancelar] erro listando pagamentos", e);
        return json({ error: "asaas_lookup_failed", detail: (e as Error).message }, 502);
      }

      // Cancela cada pagamento conforme o status
      for (const p of payments) {
        try {
          if (PAID.has(p.status)) {
            const r = await refundPayment(p.id, { description: motivo.slice(0, 250) });
            refunds.push({ id: p.id, action: "refund", status: r?.status });
            const url = r?.transactionReceiptUrl || r?.refunds?.[0]?.transactionReceiptUrl;
            if (url && !comprovanteUrl) comprovanteUrl = url;
          } else if (PENDING.has(p.status)) {
            await deletePayment(p.id);
            refunds.push({ id: p.id, action: "delete" });
          } else {
            refunds.push({ id: p.id, action: "skip", status: p.status });
          }
        } catch (e) {
          console.error("[cancelar] erro em pagamento", p.id, e);
          return json({
            error: "refund_failed",
            payment_id: p.id,
            detail: (e as Error).message,
            partial: refunds,
          }, 502);
        }
      }
    }

    const novoStatus = (!isCortesia && paymentRef) ? "estornado" : "cancelado";
    const update: any = {
      status: novoStatus,
      motivo_cancelamento: motivo,
      cancelado_em: new Date().toISOString(),
      cancelado_por: userData.user.id,
    };
    if (comprovanteUrl && tipo === "ingresso") {
      update.comprovante_estorno_url = comprovanteUrl;
    }

    const { error: upErr } = await admin.from(table).update(update).eq("id", id);
    if (upErr) throw upErr;

    return json({ ok: true, status: novoStatus, refunds, comprovante_url: comprovanteUrl });
  } catch (e) {
    console.error("[cancelar-ingresso]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
