// Helper: recalcula valor_bruto / valor_liquido / taxa_total para um conjunto de ingressos
// usando os pagamentos do Asaas. Suporta parcelado (soma todas as parcelas pagas do installment).
import { listPayments, getPayment, listInstallmentPayments, getInstallment } from "./asaas.ts";

const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

export interface RecomputeOpts {
  checkoutId?: string | null;
  externalRef?: string | null;
  paymentId?: string | null;
  installmentId?: string | null;
  ingressoIds?: string[] | null;
}

export async function recomputeIngressosFinancials(admin: any, opts: RecomputeOpts) {
  // 1) Busca ingressos relacionados
  let query = admin.from("ingressos").select("id, cortesia, valor_total, asaas_payment_id, checkout_id");
  if (opts.ingressoIds && opts.ingressoIds.length > 0) {
    query = query.in("id", opts.ingressoIds);
  } else if (opts.checkoutId) {
    query = query.eq("checkout_id", opts.checkoutId);
  } else if (opts.paymentId) {
    query = query.eq("asaas_payment_id", opts.paymentId);
  } else if (opts.externalRef) {
    const ids = opts.externalRef.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return { updated: 0 };
    query = query.in("id", ids);
  } else {
    return { updated: 0 };
  }

  const { data: ingressos, error } = await query;
  if (error) throw error;
  if (!ingressos || ingressos.length === 0) return { updated: 0 };

  const naoCortesia = ingressos.filter((i: any) => !i.cortesia);

  // 2) Coleta pagamentos no Asaas — prioriza installment (parcelado)
  let payments: any[] = [];

  if (opts.installmentId) {
    const data = await listInstallmentPayments(opts.installmentId);
    payments = data?.data || [];
  } else if (opts.paymentId) {
    const p = await getPayment(opts.paymentId);
    if (p?.installment) {
      const data = await listInstallmentPayments(p.installment);
      payments = data?.data || [];
    } else if (p) {
      payments = [p];
    }
  } else if (opts.externalRef) {
    const data = await listPayments({ externalReference: opts.externalRef, limit: 100 });
    payments = data?.data || [];
    // Se algum dos pagamentos for de installment, expande para todas as parcelas
    const installmentIds = new Set(payments.map((p) => p.installment).filter(Boolean));
    if (installmentIds.size > 0) {
      payments = [];
      for (const iid of installmentIds) {
        const d = await listInstallmentPayments(iid as string);
        payments.push(...((d?.data) || []));
      }
    }
  }

  if (naoCortesia.length === 0 || payments.length === 0) {
    // Mesmo sem pagamentos, zera cortesias para não ficar nulo
    for (const c of ingressos.filter((i: any) => i.cortesia)) {
      await admin.from("ingressos").update({
        valor_bruto: 0, valor_liquido: 0, taxa_total: 0,
      }).eq("id", c.id);
    }
    return { updated: 0 };
  }

  // Filtra só pagos
  const pagos = payments.filter((p) => PAID_STATUSES.has(p.status));
  if (pagos.length === 0) return { updated: 0 };

  // 3) Agrega
  let bruto = 0;
  let liquido = 0;
  let dataPag: string | null = null;
  let dataCred: string | null = null;
  for (const p of pagos) {
    bruto += Number(p.value || 0);
    liquido += Number(p.netValue ?? p.value ?? 0);
    const d = p.paymentDate || p.confirmedDate || p.clientPaymentDate;
    if (d && (!dataPag || d > dataPag)) dataPag = d;
    if (p.creditDate && (!dataCred || p.creditDate > dataCred)) dataCred = p.creditDate;
  }

  // 4) Distribui entre ingressos não-cortesia
  const baseSum = naoCortesia.reduce((s: number, i: any) => s + Number(i.valor_total || 0), 0);
  const usarProporcional = baseSum > 0;

  const dataPagISO = dataPag ? new Date(dataPag).toISOString() : null;
  for (const ing of naoCortesia) {
    const peso = usarProporcional ? Number(ing.valor_total || 0) / baseSum : 1 / naoCortesia.length;
    const vb = Number((bruto * peso).toFixed(2));
    const vl = Number((liquido * peso).toFixed(2));
    await admin.from("ingressos").update({
      valor_bruto: vb,
      valor_liquido: vl,
      taxa_total: Number((vb - vl).toFixed(2)),
      data_pagamento: dataPagISO,
      data_credito: dataCred,
    }).eq("id", ing.id);
  }

  // Cortesias zeradas
  for (const c of ingressos.filter((i: any) => i.cortesia)) {
    await admin.from("ingressos").update({
      valor_bruto: 0, valor_liquido: 0, taxa_total: 0,
    }).eq("id", c.id);
  }

  return { updated: naoCortesia.length, bruto, liquido, parcelas: pagos.length };
}

// Resolve um pagamento Asaas (paymentId ou installmentId) para a lista de ingressos
// usando o externalReference que o create-checkout grava ("id1,id2,...").
export async function resolveIngressosFromAsaas(opts: { paymentId?: string | null; installmentId?: string | null }) {
  let externalRef: string | null = null;
  let installmentId: string | null = opts.installmentId || null;

  if (installmentId) {
    try {
      const inst = await getInstallment(installmentId);
      externalRef = inst?.externalReference || null;
    } catch (_) { /* ignore */ }
  }

  if (!externalRef && opts.paymentId) {
    try {
      const p = await getPayment(opts.paymentId);
      externalRef = p?.externalReference || null;
      if (!installmentId && p?.installment) installmentId = p.installment;
      if (!externalRef && installmentId) {
        const inst = await getInstallment(installmentId);
        externalRef = inst?.externalReference || null;
      }
    } catch (_) { /* ignore */ }
  }

  const ids = (externalRef || "").split(",").map((s) => s.trim()).filter(Boolean);
  return { ingressoIds: ids, installmentId, externalRef };
}
