// Rateio financeiro definitivo por checkout.
//
// Regra:
// 1) Para cada checkout pago, junta TODOS os pagamentos Asaas daquele checkout
//    (PIX simples = 1 pagamento; cartão parcelado = N parcelas).
// 2) bruto = soma de payment.value; liquido = bruto - taxa (taxa calculada
//    com as regras reais Asaas em _shared/taxas.ts).
// 3) Separa os itens locais do checkout em ingressos e produtos.
// 4) Distribui bruto/liquido/taxa proporcionalmente ao valor_total de cada item.
// 5) Reconciliação garantida:
//      por linha:   bruto - liquido = taxa
//      por checkout: soma(linhas.bruto) ~= payment.value somado
//
// Usa preferencialmente os webhooks já armazenados em asaas_webhook_events
// (zero chamadas Asaas), com fallback à API quando o webhook não estiver disponível.

import { calcularTaxaPagamento } from "./taxas.ts";
import { getCheckout, getPayment, listInstallmentPayments, listPayments } from "./asaas.ts";

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const PAID_EVENTS = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH"];

export interface PaymentTotals {
  bruto: number;
  taxa: number;
  liquido: number;
  dataPagamento: string | null;
  dataCredito: string | null;
  formaPagamento: "pix" | "credit_card" | "boleto" | null;
  parcelas: number;
  stableId: string | null;
  payments: any[];
}

function reduzPagamentos(pagos: any[]): PaymentTotals {
  let bruto = 0;
  let taxa = 0;
  let dataPag: string | null = null;
  let dataCred: string | null = null;
  const billingCounts: Record<string, number> = {};
  let parcelasReais = 1;
  for (const p of pagos) {
    const value = Number(p.value || 0);
    const billing = String(p.billingType || "").toUpperCase();
    if (billing) billingCounts[billing] = (billingCounts[billing] || 0) + 1;
    const { taxaTotal } = calcularTaxaPagamento(p);
    bruto += value;
    taxa += taxaTotal;
    if (p.installment) {
      const totalParc = Number(p.installmentCount || 0);
      if (totalParc > parcelasReais) parcelasReais = totalParc;
    }
    const d = p.paymentDate || p.confirmedDate || p.clientPaymentDate;
    if (d && (!dataPag || d > dataPag)) dataPag = d;
    if (p.creditDate && (!dataCred || p.creditDate > dataCred)) dataCred = p.creditDate;
  }
  const installmentSet = new Set(pagos.map((p) => p.installment).filter(Boolean));
  const stableInstallmentId = installmentSet.size === 1 ? Array.from(installmentSet)[0] as string : null;
  if (parcelasReais === 1 && stableInstallmentId) parcelasReais = pagos.length;
  const singleId = !stableInstallmentId && pagos.length === 1 ? pagos[0].id : null;
  const dominant = Object.entries(billingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const forma = dominant === "CREDIT_CARD" || dominant === "CREDITCARD" ? "credit_card"
    : dominant === "PIX" ? "pix"
    : dominant === "BOLETO" ? "boleto"
    : null;
  bruto = Number(bruto.toFixed(2));
  taxa = Number(taxa.toFixed(2));
  return {
    bruto,
    taxa,
    liquido: Number((bruto - taxa).toFixed(2)),
    dataPagamento: dataPag ? new Date(dataPag).toISOString() : null,
    dataCredito: dataCred,
    formaPagamento: forma,
    parcelas: parcelasReais,
    stableId: stableInstallmentId || singleId || null,
    payments: pagos,
  };
}

// Carrega pagamentos Asaas de um checkout usando os webhooks armazenados como fonte primária.
// Se não houver webhook, opcionalmente busca na API (fallback).
export async function loadPaymentsByCheckout(
  admin: any,
  checkoutId: string,
  opts: { allowApiFallback?: boolean; webhookCache?: Map<string, any[]> } = {},
): Promise<PaymentTotals | null> {
  // 1) Webhooks PAYMENT_* com checkoutSession = checkoutId
  let pagamentosWebhook: any[] = [];
  if (opts.webhookCache && opts.webhookCache.has(checkoutId)) {
    pagamentosWebhook = opts.webhookCache.get(checkoutId)!;
  } else {
    const { data: evs } = await admin
      .from("asaas_webhook_events")
      .select("payload, created_at")
      .in("event_type", [...PAID_EVENTS, "PAYMENT_CREATED"])
      .eq("payload->payment->>checkoutSession", checkoutId)
      .order("created_at", { ascending: false })
      .limit(200);
    const seen = new Set<string>();
    for (const ev of evs || []) {
      const p = (ev as any).payload?.payment;
      if (!p) continue;
      const key = p.id || JSON.stringify(p);
      if (seen.has(key)) continue;
      seen.add(key);
      pagamentosWebhook.push(p);
    }
  }

  // Expande parcelas (webhook só traz a parcela individual; precisamos das demais)
  const installmentIds = new Set(pagamentosWebhook.map((p) => p.installment).filter(Boolean));
  let pagamentos = [...pagamentosWebhook];
  for (const iid of installmentIds) {
    try {
      const d = await listInstallmentPayments(iid as string);
      const parcs = d?.data || [];
      // Substitui os pagamentos da mesma installment pelos retornados pela API (autoritativos)
      pagamentos = pagamentos.filter((p) => p.installment !== iid);
      pagamentos.push(...parcs);
    } catch (e) {
      console.warn("[rateio] listInstallmentPayments falhou", iid, (e as Error).message);
    }
  }

  let pagos = pagamentos.filter((p) => PAID.has(p.status));

  // 2) Fallback API: se nenhum webhook trouxe o pagamento, busca o checkout no Asaas
  if (pagos.length === 0 && opts.allowApiFallback) {
    try {
      const ck = await getCheckout(checkoutId);
      const ckPaymentId = ck?.payment?.id || (typeof ck?.payment === "string" ? ck.payment : null);
      const ckInstallmentId = ck?.installment?.id || (typeof ck?.installment === "string" ? ck.installment : null);
      if (ckInstallmentId) {
        const d = await listInstallmentPayments(ckInstallmentId);
        pagos = (d?.data || []).filter((p: any) => PAID.has(p.status));
      } else if (ckPaymentId) {
        const p = await getPayment(ckPaymentId);
        if (p?.installment) {
          const d = await listInstallmentPayments(p.installment);
          pagos = (d?.data || []).filter((x: any) => PAID.has(x.status));
        } else if (p && PAID.has(p.status)) {
          pagos = [p];
        }
      }
    } catch (e) {
      console.warn("[rateio] fallback getCheckout falhou", checkoutId, (e as Error).message);
    }
  }

  if (pagos.length === 0) return null;
  return reduzPagamentos(pagos);
}

export interface RateioItem {
  id: string;
  valor_total: number;
  taxa_manual: number | null;
  current_bruto?: number | null;
  current_liquido?: number | null;
}

export interface RateioResult {
  bruto: number;
  liquido: number;
  taxa: number;
}

// Distribui totals.bruto/liquido entre items proporcionalmente ao valor_total.
// Retorna um Map id -> {bruto, liquido, taxa} já arredondado, com saldo no último item.
export function ratearItens(
  itens: RateioItem[],
  brutoAlocado: number,
  liquidoAlocado: number,
): Map<string, RateioResult> {
  const out = new Map<string, RateioResult>();
  if (itens.length === 0) return out;
  const baseSum = itens.reduce((s, i) => s + Number(i.valor_total || 0), 0);
  let restB = brutoAlocado;
  let restL = liquidoAlocado;
  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    const isLast = i === itens.length - 1;
    const peso = baseSum > 0 ? Number(it.valor_total || 0) / baseSum : 1 / itens.length;
    const vb = isLast ? Number(restB.toFixed(2)) : Number((brutoAlocado * peso).toFixed(2));
    const vl = isLast ? Number(restL.toFixed(2)) : Number((liquidoAlocado * peso).toFixed(2));
    restB = Number((restB - vb).toFixed(2));
    restL = Number((restL - vl).toFixed(2));
    // Se houver taxa_manual, ela manda no líquido.
    const taxaManual = it.taxa_manual !== null && it.taxa_manual !== undefined ? Number(it.taxa_manual) : null;
    const vlFinal = taxaManual !== null ? Number((vb - taxaManual).toFixed(2)) : vl;
    const taxaFinal = taxaManual !== null ? Number(taxaManual.toFixed(2)) : Number((vb - vlFinal).toFixed(2));
    out.set(it.id, { bruto: vb, liquido: vlFinal, taxa: taxaFinal });
  }
  return out;
}

// Aplica rateio para um checkout: divide bruto/liquido entre ingressos+produtos
// pela participação de cada item (valor_total). Atualiza ambas as tabelas.
export async function aplicarRateioCheckout(
  admin: any,
  checkoutId: string,
  totals: PaymentTotals,
): Promise<{ ingressosUpd: number; produtosUpd: number }> {
  // Carrega ingressos não-cortesia pagos do checkout
  const { data: ingsRaw } = await admin
    .from("ingressos")
    .select("id, valor_total, taxa_manual, cortesia, asaas_payment_id, status")
    .eq("checkout_id", checkoutId);

  const ingressos = (ingsRaw || []).filter((i: any) => !i.cortesia && (i.status === "pago" || i.status === "estornado" || i.status === "pendente"));
  // Cortesias sempre zeradas
  const cortesias = (ingsRaw || []).filter((i: any) => i.cortesia);
  for (const c of cortesias) {
    await admin.from("ingressos").update({
      valor_bruto: 0, valor_liquido: 0, taxa_total: 0,
    }).eq("id", c.id);
  }
  const ingressosPagos = ingressos.filter((i: any) => i.status === "pago");

  // Carrega produtos pagos do checkout
  const { data: prodsRaw } = await admin
    .from("pedidos_produtos")
    .select("id, valor_total, taxa_manual, status, asaas_payment_id")
    .eq("checkout_id", checkoutId);
  const produtos = (prodsRaw || []).filter((p: any) => p.status === "pago" || p.status === "retirado");

  const ingressosSum = ingressosPagos.reduce((s: number, i: any) => s + Number(i.valor_total || 0), 0);
  const produtosSum = produtos.reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);
  const denom = ingressosSum + produtosSum;

  let ingressosUpd = 0;
  let produtosUpd = 0;

  if (ingressosPagos.length > 0 && ingressosSum > 0) {
    const share = denom > 0 ? ingressosSum / denom : 1;
    const brutoIng = Number((totals.bruto * share).toFixed(2));
    const liquidoIng = Number((totals.liquido * share).toFixed(2));
    const rateio = ratearItens(
      ingressosPagos.map((i: any) => ({ id: i.id, valor_total: Number(i.valor_total || 0), taxa_manual: i.taxa_manual })),
      brutoIng,
      liquidoIng,
    );
    for (const ing of ingressosPagos) {
      const r = rateio.get(ing.id);
      if (!r) continue;
      const upd: any = {
        valor_bruto: r.bruto,
        valor_liquido: r.liquido,
        taxa_total: r.taxa,
        data_pagamento: totals.dataPagamento,
        data_credito: totals.dataCredito,
        parcelas: totals.parcelas,
      };
      if (totals.formaPagamento) upd.forma_pagamento = totals.formaPagamento;
      if (totals.stableId && !ing.asaas_payment_id) upd.asaas_payment_id = totals.stableId;
      await admin.from("ingressos").update(upd).eq("id", ing.id);
      ingressosUpd++;
    }
  }

  if (produtos.length > 0 && produtosSum > 0) {
    const share = denom > 0 ? produtosSum / denom : 1;
    const brutoProd = Number((totals.bruto * share).toFixed(2));
    const liquidoProd = Number((totals.liquido * share).toFixed(2));
    const rateio = ratearItens(
      produtos.map((p: any) => ({ id: p.id, valor_total: Number(p.valor_total || 0), taxa_manual: p.taxa_manual })),
      brutoProd,
      liquidoProd,
    );
    for (const p of produtos) {
      const r = rateio.get(p.id);
      if (!r) continue;
      const upd: any = {
        valor_bruto: r.bruto,
        valor_liquido: r.liquido,
        taxa_total: r.taxa,
        data_pagamento: totals.dataPagamento,
        data_credito: totals.dataCredito,
        parcelas: totals.parcelas,
      };
      if (totals.formaPagamento) upd.forma_pagamento = totals.formaPagamento;
      if (totals.stableId && !p.asaas_payment_id) upd.asaas_payment_id = totals.stableId;
      await admin.from("pedidos_produtos").update(upd).eq("id", p.id);
      produtosUpd++;
    }
  }

  return { ingressosUpd, produtosUpd };
}

// Carrega todos os webhooks PAYMENT_* uma única vez e agrupa por checkoutSession.
// Usado pelo backfill em massa para evitar uma query por checkout.
export async function preloadWebhookCacheByCheckout(admin: any): Promise<Map<string, any[]>> {
  const cache = new Map<string, any[]>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin
      .from("asaas_webhook_events")
      .select("payload")
      .in("event_type", [...PAID_EVENTS, "PAYMENT_CREATED"])
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn("[rateio] preload webhooks falhou", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const ev of data) {
      const p = (ev as any).payload?.payment;
      const ck = p?.checkoutSession;
      if (!ck) continue;
      if (!cache.has(ck)) cache.set(ck, []);
      // Dedup por payment.id
      const arr = cache.get(ck)!;
      if (!arr.some((x) => x.id === p.id)) arr.push(p);
    }
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 20000) break; // sanity cap
  }
  return cache;
}

// Helper para uso no webhook em tempo real: dado paymentId / installmentId, processa o checkout.
export async function aplicarRateioPorPagamento(
  admin: any,
  opts: { paymentId?: string | null; installmentId?: string | null; checkoutId?: string | null },
): Promise<{ checkoutId: string | null; ingressosUpd: number; produtosUpd: number } | null> {
  let checkoutId = opts.checkoutId || null;
  let pagos: any[] = [];

  if (opts.installmentId) {
    const d = await listInstallmentPayments(opts.installmentId);
    pagos = (d?.data || []).filter((p: any) => PAID.has(p.status));
    if (!checkoutId && pagos[0]?.checkoutSession) checkoutId = pagos[0].checkoutSession;
  } else if (opts.paymentId) {
    const p = await getPayment(opts.paymentId);
    if (p?.installment) {
      const d = await listInstallmentPayments(p.installment);
      pagos = (d?.data || []).filter((x: any) => PAID.has(x.status));
    } else if (p && PAID.has(p.status)) {
      pagos = [p];
    }
    if (!checkoutId && p?.checkoutSession) checkoutId = p.checkoutSession;
  }

  if (!checkoutId) return null;
  const totals = pagos.length > 0
    ? reduzPagamentos(pagos)
    : await loadPaymentsByCheckout(admin, checkoutId, { allowApiFallback: true });
  if (!totals) return { checkoutId, ingressosUpd: 0, produtosUpd: 0 };
  const res = await aplicarRateioCheckout(admin, checkoutId, totals);
  return { checkoutId, ...res };
}
