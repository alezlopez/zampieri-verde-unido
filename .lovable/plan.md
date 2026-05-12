## Problema

Hoje o backend usa a API de **Cobrança** do Asaas (`POST /payments`) e força um único `billingType`. Quando o cliente escolhe "à vista", mandamos `PIX`, então a página final só aceita PIX. Se mandássemos `CREDIT_CARD`, só aceitaria cartão. A API de cobrança não suporta múltiplos métodos por cobrança.

## Solução

Migrar para o **Asaas Checkout** (`POST /v3/checkouts`), que gera uma página hospedada onde o cliente escolhe o método entre os habilitados. Mantemos a UX atual com 2 botões: **À vista** (PIX **ou** cartão 1x) e **Parcelado** (cartão em N parcelas).

## Comportamento por opção

| Opção UI | `billingTypes` enviado | `chargeTypes` | Parcelas |
|---|---|---|---|
| À vista | `["PIX","CREDIT_CARD"]` | `["DETACHED"]` | 1 |
| Parcelado | `["CREDIT_CARD"]` | `["INSTALLMENT"]` | até `evento.max_parcelas` |

Preço por ingresso continua usando `preco`/`preco_meia` na à vista e `preco_parcelado`/`preco_meia_parcelado` no parcelado (sem mudança de regra de meia).

## Mudanças técnicas

### 1. `supabase/functions/_shared/asaas.ts`
- Adicionar `createCheckout(input)` chamando `POST /v3/checkouts` com:
  - `billingTypes`, `chargeTypes`
  - `minutesToExpire: 2880` (48 h, igual ao dueDate atual)
  - `callback: { successUrl, cancelUrl }` apontando para `/eventos/meus-ingressos`
  - `items: [{ description, quantity:1, value }]` — um item por ingresso, valor já calculado pelo back
  - `customer: <id>` (reaproveita `getOrCreateCustomer`)
  - `externalReference: <ingresso_ids csv>` (igual ao atual, para conciliar no webhook)
  - quando `chargeTypes=["INSTALLMENT"]`, adicionar `installment: { maxInstallmentCount }`
- Manter `createPayment` por enquanto (não remover, pode haver pendentes antigos), só deixar de chamar.

### 2. `supabase/functions/asaas-create-checkout/index.ts`
- Trocar a chamada `createPayment(...)` por `createCheckout(...)`.
- Montar `items[]` a partir dos ingressos (descrição: `evento.titulo + " — " + nome_participante|"Ingresso"`).
- Persistir em `ingressos`:
  - `checkout_url` = `checkout.link`
  - `checkout_id` / `asaas_payment_id` = `checkout.id` (mantém colunas existentes; `asaas_payment_id` real será atualizado pelo webhook quando o pagamento nascer)
  - demais campos (`forma_pagamento`, `parcelas`, `valor_total`) seguem iguais
- Idempotência: continua respeitando `checkout_url` já preenchido.

### 3. `supabase/functions/asaas-webhook/index.ts` (verificar)
- Eventos `PAYMENT_CREATED/CONFIRMED/RECEIVED` continuam chegando com `externalReference = ingresso_ids` → conciliação atual segue funcionando.
- Adicionar (se ainda não tratar) atualização do `asaas_payment_id` no primeiro `PAYMENT_CREATED` para refletir o pagamento real gerado pelo checkout.

### 4. Frontend `src/pages/EventoCompra.tsx`
- Renomear o copy do botão à vista para algo como **"PIX ou cartão à vista"** (label do RadioGroup), deixando claro que ambos estão liberados.
- Nada muda no fluxo de inserção dos ingressos nem na regra de meia.

## Fora de escopo

- Não muda RLS, RPCs de meia (`contar_meias_evento`), template de e-mail, fluxo de comprador externo nem schema do banco.
- Não remove `createPayment` (mantido para retrocompatibilidade de pendentes antigos).

## Verificação após implementar

1. Deploy automático das edge functions.
2. Teste manual: criar ingresso à vista → abrir link → confirmar que aparecem PIX **e** cartão. Repetir parcelado → só cartão com seletor de parcelas.
3. Conferir logs do webhook para garantir que `PAYMENT_CONFIRMED` ainda atualiza o ingresso para `pago`.
