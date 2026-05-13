import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { recomputeIngressosFinancials } from "../_shared/financeiro.ts";

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

  const eventId: string = payload?.id || `${payload?.event}-${payload?.payment?.id || payload?.checkout?.id}-${Date.now()}`;
  const eventType: string = payload?.event || "UNKNOWN";
  const paymentId: string | null = payload?.payment?.id || null;
  const installmentId: string | null = payload?.payment?.installment || null;
  const checkoutObj: any = payload?.checkout || null;
  // checkoutSession vem nos eventos PAYMENT_*; checkout.id vem nos eventos CHECKOUT_*
  const checkoutId: string | null = checkoutObj?.id || payload?.payment?.checkoutSession || null;

  // Idempotência
  const { error: insErr } = await admin.from("asaas_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    payment_id: paymentId,
    payload,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[asaas-webhook] insert event failed", insErr);
  }

  try {
    // Mapeamento de eventos de checkout
    const CHECKOUT_STATUS_MAP: Record<string, string> = {
      CHECKOUT_PAID: "pago",
      CHECKOUT_CANCELED: "pendente",
      CHECKOUT_EXPIRED: "pendente",
    };

    const newStatus = STATUS_MAP[eventType] || CHECKOUT_STATUS_MAP[eventType];
    const externalRef: string | null =
      payload?.payment?.externalReference ||
      checkoutObj?.externalReference ||
      null;

    // ============ ROTEAMENTO: pedidos de PRODUTO (prefixo "prod:") ============
    const isProdRef = !!(externalRef && externalRef.startsWith("prod:"));
    if (newStatus && isProdRef) {
      const prodIds = externalRef!.slice(5).split(",").map((s) => s.trim()).filter(Boolean);
      const stableId = installmentId || paymentId;
      const updateP: any = { status: newStatus };
      if (stableId) updateP.asaas_payment_id = stableId;
      let matchedP: any[] | null = null;
      if (checkoutId) {
        const r = await admin.from("pedidos_produtos").update(updateP).eq("checkout_id", checkoutId).select("id");
        if (!r.error) matchedP = r.data;
      }
      // Fallback por IDs explícitos só se NÃO houver checkoutId (evita propagar erradamente)
      if ((!matchedP || matchedP.length === 0) && !checkoutId && prodIds.length > 0) {
        const r = await admin.from("pedidos_produtos").update(updateP).in("id", prodIds).select("id");
        if (!r.error) matchedP = r.data;
      }
      if (newStatus === "pago" && matchedP && matchedP.length > 0) {
        try {
          const { recomputePedidosProdutos } = await import("../_shared/produtos-financeiro.ts");
          await recomputePedidosProdutos(admin, { checkoutId, paymentId, installmentId, pedidoIds: prodIds });
        } catch (e) {
          console.error("[asaas-webhook] recompute produtos falhou", e);
        }
      } else if (newStatus === "estornado" && matchedP && matchedP.length > 0) {
        // Zera valores em estorno
        await admin.from("pedidos_produtos").update({
          valor_bruto: 0, valor_liquido: 0, taxa_total: 0, data_credito: null,
        }).in("id", matchedP.map((m) => m.id));
      }
      await admin.from("asaas_webhook_events").update({ processed: true }).eq("event_id", eventId);
      return new Response(JSON.stringify({ ok: true, kind: "produto" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newStatus) {
      const update: any = { status: newStatus };
      // Para parcelado guardamos o id do PARCELAMENTO (estável entre as N parcelas).
      // Para pagamento simples guardamos o paymentId.
      const stableId = installmentId || paymentId;
      if (stableId) update.asaas_payment_id = stableId;
      if (newStatus === "pago") update.utilizado = false;

      let matched: any[] | null = null;

      // 1) Casa pelo checkout_id (mais confiável: vem do checkoutSession ou checkout.id)
      if (checkoutId) {
        const r = await admin
          .from("ingressos")
          .update(update)
          .eq("checkout_id", checkoutId)
          .select("id");
        if (r.error) throw r.error;
        matched = r.data;
      }

      // 2) Casa pelo asaas_payment_id já gravado (installmentId ou paymentId).
      //    Restringe sempre por checkout_id quando disponível para evitar contaminar
      //    ingressos de outros compradores que possam compartilhar o mesmo id por bug histórico.
      if ((!matched || matched.length === 0) && stableId && checkoutId) {
        const r = await admin
          .from("ingressos")
          .update(update)
          .eq("asaas_payment_id", stableId)
          .eq("checkout_id", checkoutId)
          .select("id");
        if (r.error) throw r.error;
        matched = r.data;
      }

      // 3) Fallback: ids vindos no externalReference
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

      // Dispara e-mail de confirmação (best-effort)
      if (newStatus === "pago" && matched && matched.length > 0) {
        // Recalcula valor líquido / taxas via API Asaas (best-effort).
        // Em parcelado, soma TODAS as parcelas via installmentId.
        try {
          await recomputeIngressosFinancials(admin, {
            checkoutId,
            paymentId,
            installmentId,
            externalRef,
          });
        } catch (e) {
          console.error("[asaas-webhook] recomputeFinancials falhou", e);
        }

        if (paymentId) {
          admin.functions.invoke("enviar-confirmacao-ingresso", {
            body: { payment_id: paymentId },
          }).catch((e) => console.error("[asaas-webhook] envio email falhou", e));
        } else {
          // Fluxo Checkout: dispara um envio por ingresso pago
          for (const row of matched) {
            admin.functions.invoke("enviar-confirmacao-ingresso", {
              body: { ingresso_id: row.id },
            }).catch((e) => console.error("[asaas-webhook] envio email (checkout) falhou", e));
          }
        }
      } else if (newStatus === "estornado" && matched && matched.length > 0) {
        // Zera valores financeiros em estorno
        await admin.from("ingressos").update({
          valor_bruto: 0, valor_liquido: 0, taxa_total: 0, data_credito: null,
        }).in("id", matched.map((m) => m.id));
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
