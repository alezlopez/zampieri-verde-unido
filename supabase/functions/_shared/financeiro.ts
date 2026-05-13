// Helper: recalcula valor_bruto / valor_liquido / taxa_total para um conjunto de ingressos
// usando os pagamentos do Asaas. Distribui proporcionalmente ao valor unitário pago,
// ou em partes iguais quando não há base. Cortesias permanecem 0.
import { listPayments, getPayment } from "./asaas.ts";

const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

export async function recomputeIngressosFinancials(
  admin: any,
  opts: { checkoutId?: string | null; externalRef?: string | null; paymentId?: string | null },
) {
  // 1) Busca ingressos relacionados
  let query = admin.from("ingressos").select("id, cortesia, valor_total, asaas_payment_id, checkout_id");
  if (opts.checkoutId) {
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
  if (naoCortesia.length === 0) return { updated: 0 };

  // 2) Lista pagamentos no Asaas pela melhor referência disponível
  let payments: any[] = [];
  if (opts.externalRef) {
    const data = await listPayments({ externalReference: opts.externalRef, limit: 100 });
    payments = data?.data || [];
  } else if (opts.paymentId) {
    const p = await getPayment(opts.paymentId);
    if (p) payments = [p];
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
    if (p.paymentDate || p.confirmedDate) {
      const d = p.paymentDate || p.confirmedDate;
      if (!dataPag || d > dataPag) dataPag = d;
    }
    if (p.creditDate) {
      if (!dataCred || p.creditDate > dataCred) dataCred = p.creditDate;
    }
  }

  // 4) Distribui entre ingressos não-cortesia (proporcional ao valor_total se houver, senão igual)
  const baseSum = naoCortesia.reduce((s: number, i: any) => s + Number(i.valor_total || 0), 0);
  const usarProporcional = baseSum > 0;

  const updates: { id: string; valor_bruto: number; valor_liquido: number; taxa_total: number; data_pagamento: string | null; data_credito: string | null }[] = [];
  for (const ing of naoCortesia) {
    const peso = usarProporcional ? Number(ing.valor_total || 0) / baseSum : 1 / naoCortesia.length;
    const vb = Number((bruto * peso).toFixed(2));
    const vl = Number((liquido * peso).toFixed(2));
    updates.push({
      id: ing.id,
      valor_bruto: vb,
      valor_liquido: vl,
      taxa_total: Number((vb - vl).toFixed(2)),
      data_pagamento: dataPag ? new Date(dataPag).toISOString() : null,
      data_credito: dataCred,
    });
  }

  // 5) Persiste (uma update por ingresso)
  for (const u of updates) {
    await admin.from("ingressos").update({
      valor_bruto: u.valor_bruto,
      valor_liquido: u.valor_liquido,
      taxa_total: u.taxa_total,
      data_pagamento: u.data_pagamento,
      data_credito: u.data_credito,
    }).eq("id", u.id);
  }

  // Cortesias: zera financeiro
  const cortesias = ingressos.filter((i: any) => i.cortesia);
  for (const c of cortesias) {
    await admin.from("ingressos").update({
      valor_bruto: 0, valor_liquido: 0, taxa_total: 0,
    }).eq("id", c.id);
  }

  return { updated: updates.length, bruto, liquido };
}
