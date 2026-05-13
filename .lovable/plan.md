## Objetivo

Adicionar no painel admin (`/eventos/admin`) uma aba **"Relatório Financeiro"** com vendas detalhadas e **valor líquido recebido** (já descontadas taxas de transação e de antecipação do parcelado), usando como fonte a API do Asaas — que entrega o líquido pronto no campo `netValue` de cada pagamento.

## Por que usar `netValue` do Asaas

O Asaas calcula e retorna por cobrança o `netValue` (valor líquido depositado na conta), que já considera:
- Taxa de transação (PIX / cartão à vista / parcelado)
- Taxa de antecipação (no parcelado, quando há antecipação)
- Estornos parciais

Assim evitamos manter uma tabela de taxas que pode ficar desatualizada — o número bate com o que cai no extrato Asaas.

## Mudanças

### 1. Banco — colunas novas em `ingressos` (migration)

Adicionar (todas nullable, preenchidas via webhook/sync):
- `valor_bruto` numeric — valor cobrado
- `valor_liquido` numeric — `netValue` do Asaas
- `taxa_total` numeric — `valor_bruto - valor_liquido`
- `data_pagamento` timestamptz — data de confirmação
- `data_credito` date — `creditDate` (quando cai na conta)

Sem alteração de RLS (já restrito a admin / dono).

### 2. Edge function `asaas-webhook` (e `asaas-sync-payment`)

Quando recebe `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`:
- Buscar o pagamento no Asaas (`GET /payments/:id`) para ler `value`, `netValue`, `paymentDate`, `creditDate`.
- Gravar nas novas colunas dos ingressos vinculados ao `asaas_payment_id`.

Para parcelados (`installment`): chamar `GET /installments/:id/payments` e somar `netValue` de todas as parcelas confirmadas; ratear proporcionalmente entre os ingressos do mesmo checkout (mesmo `checkout_id`).

### 3. Edge function nova `relatorio-vendas` (admin only)

Recebe filtros (período, evento, status, forma de pagamento) e devolve:
- Lista detalhada de ingressos com bruto, líquido, taxa, % taxa, evento, comprador, forma, parcelas, datas.
- Totais agregados: bruto, líquido, taxa, ticket médio, qtd ingressos, qtd cortesias.
- Quebra por evento e por forma de pagamento (PIX vs cartão à vista vs cartão parcelado).
- Para ingressos `pago` sem `valor_liquido` ainda preenchido (legado), faz fallback ao vivo no Asaas.

Protegida por `has_role(auth.uid(), 'admin')`.

### 4. Frontend — nova aba no `EventosAdmin.tsx`

Aba **"Relatório Financeiro"** com:
- Filtros: intervalo de datas (data de pagamento), evento (select), forma de pagamento, status.
- Cards de KPI: Bruto, Líquido, Taxas (R$ e %), Ingressos pagos, Cortesias.
- Tabela detalhada (paginada): evento, comprador, participante, forma, parcelas, data pagamento, bruto, líquido, taxa.
- Quebra por evento (mini-tabela) e por forma de pagamento.
- Botão **Exportar CSV** com as mesmas colunas + linha de totais.

### 5. Tela do comprador (`MeusIngressos.tsx`)

Sem mudança — campos novos são internos do admin.

## O que NÃO muda

- Fluxo de compra, checkout, RLS existentes, cortesias, `EventoCompra.tsx`, `EventoDetalhe.tsx`.
- Tabela `eventos` e demais relatórios atuais.

## Detalhes técnicos

- Reuso de `supabase/functions/_shared/asaas.ts` (adicionar helpers `getPayment(id)` e `listInstallmentPayments(id)`).
- Frontend chama a edge via `supabase.functions.invoke("relatorio-vendas", { body: filtros })`.
- Cortesias entram no relatório com bruto=0, líquido=0 e flag `cortesia=true` (não distorcem ticket médio — calculado só sobre ingressos pagos não-cortesia).
- Backfill: script único (botão "Sincronizar líquidos pendentes" no painel) que percorre ingressos `pago` sem `valor_liquido` e busca no Asaas — sem migração de dados destrutiva.