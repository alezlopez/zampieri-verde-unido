// Recalcula valor_bruto/valor_liquido/taxa_total para pedidos_produtos pagos.
// Aplica a mesma lógica de antecipação automática do Asaas usada em ingressos.
import { listPayments, getPayment, listInstallmentPayments } from "./asaas.ts";

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const ANTECIP_AVISTA = 0.0215;
const ANTECIP_PARCELADO = 0.026;

export async function recomputePedidosProdutos(admin: any, opts: {
  checkoutId?: string | null;
  paymentId?: string | null;
  installmentId?: string | null;
  pedidoIds?: string[] | null;
}) {
  // Carrega pedidos
  let q = admin.from("pedidos_produtos").select("id, valor_total, checkout_id, asaas_payment_id");
  if (opts.checkoutId) q = q.eq("checkout_id", opts.checkoutId);
  else if (opts.pedidoIds && opts.pedidoIds.length > 0) q = q.in("id", opts.pedidoIds);
  else if (opts.installmentId || opts.paymentId) q = q.eq("asaas_payment_id", opts.installmentId || opts.paymentId);
  else return { updated: 0 };
  const { data: pedidosRaw } = await q;
  let pedidos = pedidosRaw || [];
  if (pedidos.length === 0) return { updated: 0 };

  // Defesa: nunca processar pedidos de checkouts diferentes em um mesmo recompute.
  const checkoutIds = new Set(pedidos.map((p: any) => p.checkout_id).filter(Boolean));
  if (checkoutIds.size > 1) {
    if (opts.checkoutId) {
      pedidos = pedidos.filter((p: any) => p.checkout_id === opts.checkoutId);
      if (pedidos.length === 0) return { updated: 0, reason: "no_pedidos_for_checkout" } as any;
    } else {
      console.error("[produtos-financeiro] múltiplos checkouts no mesmo grupo — abortando", { count: checkoutIds.size });
      return { updated: 0, reason: "multi_checkout_group" } as any;
    }
  }

  // Coleta pagamentos
  let payments: any[] = [];
  if (opts.installmentId) {
    const d = await listInstallmentPayments(opts.installmentId);
    payments = d?.data || [];
  } else if (opts.paymentId) {
    const p = await getPayment(opts.paymentId);
    if (p?.installment) {
      const d = await listInstallmentPayments(p.installment);
      payments = d?.data || [];
    } else if (p) payments = [p];
  } else if (opts.checkoutId) {
    // Eventos PAYMENT_* do Asaas nem sempre trazem externalReference, mas trazem checkoutSession.
    // Usa o histórico de webhooks como fonte local e autoritativa para não depender de filtros
    // frágeis da listagem de pagamentos.
    const { data: evs, error: evErr } = await admin
      .from("asaas_webhook_events")
      .select("payload, payment_id")
      .in("event_type", ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH", "PAYMENT_CREATED"])
      .order("created_at", { ascending: false })
      .limit(1000);
    if (evErr) console.warn("[produtos-financeiro] erro lendo webhooks", evErr);

    const seen = new Set<string>();
    payments = (evs || [])
      .map((ev: any) => ev.payload?.payment)
      .filter((p: any) => p?.checkoutSession === opts.checkoutId)
      .filter((p: any) => {
        const key = p.id || p.installment || JSON.stringify(p);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const instSet = new Set(payments.map((p) => p.installment).filter(Boolean));
    if (instSet.size > 0) {
      const expanded: any[] = [];
      for (const iid of instSet) {
        const dd = await listInstallmentPayments(iid as string);
        expanded.push(...((dd?.data) || []));
      }
      payments = [...payments.filter((p) => !p.installment), ...expanded];
    }

    // Fallback legado: alguns pagamentos podem ter sido criados com externalReference preenchido.
    if (payments.length === 0) {
      const ids = (opts.pedidoIds && opts.pedidoIds.length > 0)
        ? opts.pedidoIds
        : pedidos.map((p: any) => p.id);
      const ref = `prod:${ids.join(",")}`;
      const d = await listPayments({ externalReference: ref, limit: 100 });
      payments = d?.data || [];
    }
  } else {
    // Sem paymentId/installmentId/checkoutId: busca pelos pedidoIds informados.
    const ids = (opts.pedidoIds && opts.pedidoIds.length > 0)
      ? opts.pedidoIds
      : pedidos.map((p: any) => p.id);
    const ref = `prod:${ids.join(",")}`;
    const d = await listPayments({ externalReference: ref, limit: 100 });
    payments = d?.data || [];
    const instSet = new Set(payments.map((p) => p.installment).filter(Boolean));
    if (instSet.size > 0) {
      const expanded: any[] = [];
      for (const iid of instSet) {
        const dd = await listInstallmentPayments(iid as string);
        expanded.push(...((dd?.data) || []));
      }
      payments = [...payments.filter((p) => !p.installment), ...expanded];
    }
  }

  const pagos = payments.filter((p) => PAID.has(p.status));
  if (pagos.length === 0) return { updated: 0 };

  const installmentSet = new Set(pagos.map((p) => p.installment).filter(Boolean));
  const stableInstallmentId = installmentSet.size === 1 ? Array.from(installmentSet)[0] as string : null;
  const singleId = !stableInstallmentId && pagos.length === 1 ? pagos[0].id : null;
  const stableId = stableInstallmentId || singleId || opts.installmentId || opts.paymentId || null;

  let bruto = 0, liquido = 0;
  let dataPag: string | null = null;
  let dataCred: string | null = null;
  const billingCounts: Record<string, number> = {};
  let parcelasReais = 1;
  for (const p of pagos) {
    const value = Number(p.value || 0);
    const netRaw = Number(p.netValue ?? p.value ?? 0);
    const billing = String(p.billingType || "").toUpperCase();
    if (billing) billingCounts[billing] = (billingCounts[billing] || 0) + 1;
    let antecip = 0;
    if (billing === "CREDIT_CARD" || billing === "CREDITCARD") {
      if (p.installment) {
        const n = Number(p.installmentNumber || 1);
        antecip = netRaw * ANTECIP_PARCELADO * n;
        const totalParc = Number(p.installmentCount || 0);
        if (totalParc > parcelasReais) parcelasReais = totalParc;
      } else {
        antecip = netRaw * ANTECIP_AVISTA;
      }
    }
    bruto += value;
    liquido += netRaw - antecip;
    const d = p.paymentDate || p.confirmedDate || p.clientPaymentDate;
    if (d && (!dataPag || d > dataPag)) dataPag = d;
    if (p.creditDate && (!dataCred || p.creditDate > dataCred)) dataCred = p.creditDate;
  }
  if (parcelasReais === 1 && stableInstallmentId) parcelasReais = pagos.length;
  const dominantBilling = Object.entries(billingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const formaPagamento = dominantBilling === "CREDIT_CARD" || dominantBilling === "CREDITCARD"
    ? "credit_card"
    : dominantBilling === "PIX"
    ? "pix"
    : dominantBilling === "BOLETO"
    ? "boleto"
    : null;
  bruto = Number(bruto.toFixed(2));
  liquido = Number(liquido.toFixed(2));

  const baseSum = pedidos.reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);
  const usar = baseSum > 0;
  const dataPagISO = dataPag ? new Date(dataPag).toISOString() : null;
  let restB = bruto, restL = liquido;
  for (let i = 0; i < pedidos.length; i++) {
    const p = pedidos[i];
    const last = i === pedidos.length - 1;
    const peso = usar ? Number(p.valor_total || 0) / baseSum : 1 / pedidos.length;
    const vb = last ? Number(restB.toFixed(2)) : Number((bruto * peso).toFixed(2));
    const vl = last ? Number(restL.toFixed(2)) : Number((liquido * peso).toFixed(2));
    restB = Number((restB - vb).toFixed(2));
    restL = Number((restL - vl).toFixed(2));
    const upd: any = {
      valor_bruto: vb, valor_liquido: vl,
      taxa_total: Number((vb - vl).toFixed(2)),
      data_pagamento: dataPagISO, data_credito: dataCred,
    };
    // Só grava asaas_payment_id se ainda não houver (evita contaminação cruzada)
    if (stableId && !p.asaas_payment_id) upd.asaas_payment_id = stableId;
    await admin.from("pedidos_produtos").update(upd).eq("id", p.id);
  }
  return { updated: pedidos.length, bruto, liquido };
}
