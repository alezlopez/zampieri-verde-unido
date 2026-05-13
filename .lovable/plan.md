## Problema

Para compras **parceladas**, o Asaas envia um `PAYMENT_CONFIRMED` por parcela. Hoje o `recomputeIngressosFinancials` só busca **uma** parcela por vez (via `getPayment`) e ainda recebe `externalReference = null`, então grava no relatório apenas o líquido de 1 parcela — e cada novo webhook sobrescreve com o líquido da próxima. Resultado: `valor_liquido`, `valor_bruto`, `taxa_total` e `data_pagamento` ficam zerados/errados nos ingressos parcelados.

Para PIX/cartão à vista funciona porque há um único `payment` e o `getPayment` já traz tudo.

## Correções

### 1. `supabase/functions/_shared/asaas.ts`
Adicionar helper:
```ts
export async function listInstallmentPayments(installmentId: string)
// GET /installments/:id/payments  → lista todas as parcelas com value/netValue/status/paymentDate/creditDate
```

### 2. `supabase/functions/_shared/financeiro.ts` (reescrever a coleta de pagamentos)
Nova lógica para montar o conjunto de pagamentos:
- Receber também `installmentId` opcional.
- Se `installmentId` estiver presente → `listInstallmentPayments(installmentId)` e usar todas as parcelas (filtradas por status pago).
- Senão se `paymentId` → `getPayment(paymentId)`. Se a resposta tiver campo `installment`, automaticamente expandir via `listInstallmentPayments`.
- Senão se `externalRef` → `listPayments({ externalReference })` (fluxo legado).

Soma `value` em `bruto` e `netValue` em `liquido` de todas as parcelas confirmadas, pega `paymentDate`/`creditDate` mais recentes. Distribuição proporcional entre ingressos não-cortesia segue igual.

### 3. `supabase/functions/asaas-webhook/index.ts`
- Extrair `installmentId = payload.payment.installment || null`.
- Ao montar o `update` dos ingressos, se `installmentId` existir, gravar `asaas_payment_id = installmentId` (id estável do parcelamento) em vez do id da parcela individual — evita sobrescrita a cada webhook e dá um identificador único para o conjunto.
- Passar `installmentId` para `recomputeIngressosFinancials`.
- Idempotência por `event_id` já cobre a chegada de N parcelas: cada uma vai disparar o recompute, mas como agora a função soma **todas** as parcelas do parcelamento, o valor final converge sempre para o total correto (a última parcela paga "fecha" o valor).

### 4. `supabase/functions/asaas-sync-payment/index.ts`
- Após `getPayment`, se `payment.installment` estiver presente, passar `installmentId` para o recompute (mesma assinatura nova).

### 5. `supabase/functions/backfill-financeiro/index.ts`
- Para ingressos pagos sem `valor_liquido`: se o `asaas_payment_id` corresponde a um id de parcelamento (prefixo diferente de `pay_`), usa direto como `installmentId`; senão chama `getPayment` e segue o mesmo caminho do item 2.
- Permite recuperar retroativamente os ingressos parcelados que já passaram com dados zerados.

### 6. (Sem mudança de schema)
Nenhuma migration nova — colunas já existem. Nenhuma mudança de RLS, frontend ou fluxo de compra.

## Verificação

1. Rodar o backfill (botão "Sincronizar líquidos pendentes" no painel admin) para os ingressos parcelados de hoje (ex.: checkouts `274c5bca…` 5x, `aa44c2aa…` 3x).
2. Conferir no Relatório Financeiro que `Bruto`, `Líquido` e `Taxa` agora batem com a soma das parcelas no extrato Asaas (ex.: 3 parcelas de 11,66 + 11,66 + 11,68 → bruto 35,00; líquido 33,53).
3. Fazer (ou aguardar) uma nova compra parcelada e confirmar que após a confirmação da última parcela os valores ficam corretos sem precisar do backfill.
