// Calcula taxa real Asaas (transação + antecipação) com base nas regras informadas pelo cliente.
// Aplica por pagamento individual (uma parcela ou pagamento à vista).
//
// Taxas de transação:
//   PIX:     R$ 0,99 fixo
//   Cartão à vista: 2,9% + R$ 0,29
//   Cartão 2-6x:    3,49% + R$ 0,29 (por parcela)
//   Cartão 7-12x:   3,99% + R$ 0,29 (por parcela)
//   Boleto:  fallback value - netValue do Asaas
//
// Taxa de antecipação (proporcional aos dias entre pagamento e vencimento):
//   À vista:   2,15% × dias/30 sobre value
//   Parcelado: 2,60% × dias/30 sobre value (dias = N×30 para parcela N se não houver datas)

const PIX_FIXO = 0.99;
const CC_AVISTA_PCT = 0.029;
const CC_PARC_2_6_PCT = 0.0349;
const CC_PARC_7_12_PCT = 0.0399;
const CC_FIXO = 0.29;
const ANTECIP_AVISTA_MES = 0.0215;
const ANTECIP_PARC_MES = 0.026;

function diasEntre(fromIso: string | null, toIso: string | null): number | null {
  if (!fromIso || !toIso) return null;
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const d = Math.round((b - a) / 86400000);
  return d > 0 ? d : 0;
}

export interface TaxaResult {
  taxaTransacao: number;
  taxaAntecipacao: number;
  taxaTotal: number;
}

export function calcularTaxaPagamento(p: any): TaxaResult {
  const value = Number(p.value || 0);
  const netRaw = Number(p.netValue ?? p.value ?? 0);
  const billing = String(p.billingType || "").toUpperCase();
  const installmentCount = Number(p.installmentCount || (p.installment ? 1 : 1)) || 1;
  const parcN = Number(p.installmentNumber || 1) || 1;
  const isParcelado = !!p.installment && installmentCount > 1;
  const isCartao = billing === "CREDIT_CARD" || billing === "CREDITCARD";

  let taxaTransacao = 0;
  if (billing === "PIX") {
    taxaTransacao = PIX_FIXO;
  } else if (isCartao) {
    let pct = CC_AVISTA_PCT;
    if (isParcelado) {
      if (installmentCount <= 6) pct = CC_PARC_2_6_PCT;
      else pct = CC_PARC_7_12_PCT;
    }
    taxaTransacao = value * pct + CC_FIXO;
  } else if (billing === "BOLETO") {
    taxaTransacao = Math.max(0, value - netRaw);
  } else {
    taxaTransacao = Math.max(0, value - netRaw);
  }

  let taxaAntecipacao = 0;
  if (isCartao) {
    const dataPag = p.paymentDate || p.confirmedDate || p.clientPaymentDate || null;
    const dueDate = p.dueDate || null;
    let dias = diasEntre(dataPag, dueDate);
    if (dias === null) {
      // fallback: parcela N = N meses (30 dias cada). À vista = 30 dias.
      dias = isParcelado ? parcN * 30 : 30;
    }
    const taxaMes = isParcelado ? ANTECIP_PARC_MES : ANTECIP_AVISTA_MES;
    taxaAntecipacao = value * taxaMes * (dias / 30);
  }

  taxaTransacao = Number(taxaTransacao.toFixed(2));
  taxaAntecipacao = Number(taxaAntecipacao.toFixed(2));
  return {
    taxaTransacao,
    taxaAntecipacao,
    taxaTotal: Number((taxaTransacao + taxaAntecipacao).toFixed(2)),
  };
}
