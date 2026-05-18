// Helper: recalcula valor_bruto / valor_liquido / taxa_total para um conjunto de ingressos
// usando os pagamentos do Asaas. Suporta:
//  - PIX / cartão à vista (1 pagamento)
//  - Cartão parcelado (N pagamentos do mesmo installment)
// Vínculo seguro (em ordem): ingressoIds explícitos, checkoutId, externalReference, paymentId.
import { listPayments, getPayment, listInstallmentPayments, getInstallment } from "./asaas.ts";

const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

export interface RecomputeOpts {
  checkoutId?: string | null;
  externalRef?: string | null;
  paymentId?: string | null;
  installmentId?: string | null;
  ingressoIds?: string[] | null;
}

async function loadIngressos(admin: any, opts: RecomputeOpts) {
  let query = admin
    .from("ingressos")
    .select("id, cortesia, valor_total, asaas_payment_id, checkout_id, status, taxa_manual");

  if (opts.ingressoIds && opts.ingressoIds.length > 0) {
    query = query.in("id", opts.ingressoIds);
  } else if (opts.checkoutId) {
    query = query.eq("checkout_id", opts.checkoutId);
  } else if (opts.externalRef) {
    const ids = opts.externalRef.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  } else if (opts.paymentId || opts.installmentId) {
    const stable = opts.installmentId || opts.paymentId;
    query = query.eq("asaas_payment_id", stable);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];

  // Defesa: nunca processar ingressos de checkouts diferentes em um mesmo recompute.
  // Se múltiplos checkouts aparecerem (sintoma de asaas_payment_id contaminado),
  // restringe ao checkoutId pedido (se houver) e descarta os demais.
  const checkoutIds = new Set(rows.map((r: any) => r.checkout_id).filter(Boolean));
  if (checkoutIds.size > 1) {
    console.warn("[financeiro] múltiplos checkouts no mesmo grupo — possível contaminação de asaas_payment_id", {
      paymentId: opts.paymentId, installmentId: opts.installmentId, checkouts: Array.from(checkoutIds),
    });
    if (opts.checkoutId) {
      return rows.filter((r: any) => r.checkout_id === opts.checkoutId);
    }
    // Sem checkoutId explícito não é seguro continuar — aborta.
    return [];
  }
  return rows;
}

async function collectPayments(opts: RecomputeOpts): Promise<any[]> {
  let payments: any[] = [];

  // 1) Se houver installment, lista todas as parcelas (única fonte autoritativa)
  if (opts.installmentId) {
    const data = await listInstallmentPayments(opts.installmentId);
    return data?.data || [];
  }

  // 2) Se houver paymentId, busca; se for parte de installment, expande
  if (opts.paymentId) {
    const p = await getPayment(opts.paymentId);
    if (p?.installment) {
      const data = await listInstallmentPayments(p.installment);
      return data?.data || [];
    }
    return p ? [p] : [];
  }

  // 3) externalReference (ids dos ingressos serializados)
  if (opts.externalRef) {
    const data = await listPayments({ externalReference: opts.externalRef, limit: 100 });
    payments = data?.data || [];
    const installmentIds = new Set(payments.map((p) => p.installment).filter(Boolean));
    if (installmentIds.size > 0) {
      const expanded: any[] = [];
      for (const iid of installmentIds) {
        const d = await listInstallmentPayments(iid as string);
        expanded.push(...((d?.data) || []));
      }
      // pagamentos não-installment + expandidos
      const nonInstall = payments.filter((p) => !p.installment);
      return [...nonInstall, ...expanded];
    }
    return payments;
  }

  return [];
}

export async function recomputeIngressosFinancials(admin: any, opts: RecomputeOpts) {
  const ingressos = await loadIngressos(admin, opts);
  if (ingressos.length === 0) return { updated: 0, reason: "no_ingressos" };

  const naoCortesia = ingressos.filter((i: any) => !i.cortesia);

  // Garante cortesias zeradas sempre
  for (const c of ingressos.filter((i: any) => i.cortesia)) {
    await admin.from("ingressos").update({
      valor_bruto: 0, valor_liquido: 0, taxa_total: 0,
    }).eq("id", c.id);
  }

  if (naoCortesia.length === 0) return { updated: 0, reason: "all_cortesia" };

  // Coleta pagamentos
  let payments: any[] = [];
  try {
    payments = await collectPayments(opts);
  } catch (e) {
    console.error("[financeiro] erro coletando pagamentos", e);
    return { updated: 0, reason: "collect_failed", error: (e as Error).message };
  }

  const pagos = payments.filter((p) => PAID_STATUSES.has(p.status));
  if (pagos.length === 0) return { updated: 0, reason: "no_paid_payments" };

  // Detecta installment para gravar como asaas_payment_id estável
  const installmentSet = new Set(pagos.map((p) => p.installment).filter(Boolean));
  const stableInstallmentId = installmentSet.size === 1
    ? Array.from(installmentSet)[0] as string
    : null;
  const singlePaymentId = !stableInstallmentId && pagos.length === 1 ? pagos[0].id : null;
  const stableId = stableInstallmentId || singlePaymentId || opts.installmentId || opts.paymentId || null;

  // Agrega bruto/líquido/datas
  // Antecipação automática Asaas (cartão): à vista 2,15%/mês, parcelado 2,60%/mês × nº meses adiantados.
  // Para parcelado: cada parcela N é antecipada em N meses (parcela 1 = 1 mês, parcela 2 = 2 meses...).
  // Para crédito à vista: 1 mês.
  // PIX/boleto: sem antecipação.
  const ANTECIP_AVISTA = 0.0215;
  const ANTECIP_PARCELADO = 0.026;
  let bruto = 0;
  let liquido = 0;
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
  // Se for installment, conta de parcelas = total de pagamentos pagos (fallback)
  if (parcelasReais === 1 && stableInstallmentId) parcelasReais = pagos.length;
  // Determina billingType dominante
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

  // Distribui proporcionalmente entre ingressos não-cortesia
  const baseSum = naoCortesia.reduce((s: number, i: any) => s + Number(i.valor_total || 0), 0);
  const usarProporcional = baseSum > 0;
  const dataPagISO = dataPag ? new Date(dataPag).toISOString() : null;

  // Para evitar perdas por arredondamento, atribui o saldo restante ao último
  let restanteB = bruto;
  let restanteL = liquido;
  for (let idx = 0; idx < naoCortesia.length; idx++) {
    const ing = naoCortesia[idx];
    const isLast = idx === naoCortesia.length - 1;
    const peso = usarProporcional ? Number(ing.valor_total || 0) / baseSum : 1 / naoCortesia.length;
    const vb = isLast ? Number(restanteB.toFixed(2)) : Number((bruto * peso).toFixed(2));
    const vl = isLast ? Number(restanteL.toFixed(2)) : Number((liquido * peso).toFixed(2));
    restanteB = Number((restanteB - vb).toFixed(2));
    restanteL = Number((restanteL - vl).toFixed(2));

    const update: any = {
      valor_bruto: vb,
      valor_liquido: vl,
      taxa_total: Number((vb - vl).toFixed(2)),
      data_pagamento: dataPagISO,
      data_credito: dataCred,
      parcelas: parcelasReais,
    };
    if (formaPagamento) update.forma_pagamento = formaPagamento;
    // Só grava asaas_payment_id se o ingresso ainda não tiver um (evita contaminação cruzada)
    if (stableId && !ing.asaas_payment_id) update.asaas_payment_id = stableId;

    await admin.from("ingressos").update(update).eq("id", ing.id);
  }

  return {
    updated: naoCortesia.length,
    bruto, liquido,
    parcelas: pagos.length,
    stableId,
  };
}

// Resolve um pagamento Asaas (paymentId/installmentId/checkoutSession) para a lista de ingressos
// usando o externalReference que o create-checkout grava ("id1,id2,...").
export async function resolveIngressosFromAsaas(opts: { paymentId?: string | null; installmentId?: string | null }) {
  let externalRef: string | null = null;
  let installmentId: string | null = opts.installmentId || null;
  let checkoutSession: string | null = null;

  if (installmentId) {
    try {
      const inst = await getInstallment(installmentId);
      externalRef = inst?.externalReference || null;
    } catch (_) { /* ignore */ }
  }

  if (opts.paymentId) {
    try {
      const p = await getPayment(opts.paymentId);
      externalRef = externalRef || p?.externalReference || null;
      if (!installmentId && p?.installment) installmentId = p.installment;
      checkoutSession = p?.checkoutSession || null;
      if (!externalRef && installmentId) {
        const inst = await getInstallment(installmentId);
        externalRef = inst?.externalReference || null;
      }
    } catch (_) { /* ignore */ }
  }

  const ids = (externalRef || "").split(",").map((s) => s.trim()).filter(Boolean);
  return { ingressoIds: ids, installmentId, externalRef, checkoutSession };
}
