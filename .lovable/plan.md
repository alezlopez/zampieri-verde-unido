## Diagnóstico

A taxa calculada (R$ 12,25) **está matematicamente correta** para o pagamento da Janaina, **mas a forma de pagamento exibida está errada**.

O que o Asaas realmente registrou para `pay_8t6q2j1qpb361ef2`:

- `billingType`: **CREDIT_CARD** (não PIX)
- `value`: R$ 240,00
- `netValue`: R$ 232,75 → taxa Asaas real = R$ 7,25
- Antecipação automática à vista (2,15%): R$ 5,00
- **Taxa total = 7,25 + 5,00 = R$ 12,25** ✅

Ou seja: a compradora pagou no **cartão à vista**, não via PIX. O sistema está exibindo "pix" porque a coluna `forma_pagamento` é gravada no momento da criação do checkout (escolha inicial do usuário) e **nunca é atualizada** quando o Asaas confirma o pagamento real (o cliente trocou de método na tela do Asaas).

Confirmei o padrão em mais de 13 ingressos: todos com `forma_pagamento='pix'` no banco, mas `billingType='CREDIT_CARD'` no webhook do Asaas — taxas batem com cartão.

## Plano de correção

### 1. Sincronizar `forma_pagamento` e `parcelas` a partir do Asaas

Em `supabase/functions/_shared/financeiro.ts` (`recomputeIngressosFinancials`) e `produtos-financeiro.ts` (`recomputePedidosProdutos`):

- Detectar `billingType` dominante nos pagamentos confirmados:
  - `CREDIT_CARD` → `forma_pagamento = 'credit_card'`
  - `PIX` → `'pix'`
  - `BOLETO` → `'boleto'`
- Detectar `parcelas` reais: se `installment` existe → `installmentCount`; senão 1.
- Gravar esses campos junto com `valor_bruto/liquido/taxa_total`.

Isso roda automaticamente em todo webhook `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`, então corrige novos pagamentos e qualquer reprocessamento.

### 2. Backfill dos registros já pagos

Migration que, para todo `ingresso`/`pedido_produtos` com status `pago` e `asaas_payment_id` preenchido, dispara `recomputeIngressosFinancials`/`recomputePedidosProdutos` (job de backfill — endpoint admin já existe: `backfill-financeiro` e `backfill-produtos-financeiro`).

Vou adicionar uma flag `force_method=true` nos dois endpoints para recalcular forma_pagamento mesmo quando `valor_liquido` já está preenchido, e instruo você a clicar "Backfill" no admin depois do deploy.

### 3. Confirmar comportamento da antecipação

Manter o cálculo atual (já está correto conforme você confirmou):

- PIX/Boleto: sem antecipação.
- Cartão à vista: `netValue × 2,15%`.
- Cartão parcelado: `netValue × 2,60% × nº meses adiantados` (parcela 1 = 1 mês, parcela 2 = 2 meses, …).

### 4. UI / Relatório

Sem alterações de UI — os filtros já existem (`pix`, `credit_card`, `todos`). Após o backfill, o relatório passa a mostrar `forma_pagamento` real e a taxa fará sentido (PIX = R$ 1,99, cartão = % real + antecipação).

## Resultado esperado

- Janaina aparecerá como **cartão à vista — R$ 240,00 — taxa R$ 12,25** (em vez de "pix").
- Pagamentos realmente em PIX aparecerão com taxa fixa de R$ 1,99.
- Pagamentos no cartão (à vista/parcelado) terão taxa = taxa Asaas + antecipação.

## Arquivos afetados

- `supabase/functions/_shared/financeiro.ts`
- `supabase/functions/_shared/produtos-financeiro.ts`
- `supabase/functions/backfill-financeiro/index.ts` (flag `force_method`)
- `supabase/functions/backfill-produtos-financeiro/index.ts` (flag `force_method`)

Nenhuma mudança de schema necessária.
