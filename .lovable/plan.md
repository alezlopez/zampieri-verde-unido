## Diagnóstico objetivo

A divergência é real no banco, não apenas visual.

- Há **527 ingressos pagos não-cortesia**.
- Soma atual dos ingressos:
  - `valor_total`: **R$ 38.570,00**
  - `valor_bruto`: **R$ 39.057,00**
  - diferença: **R$ 487,00**
- Existem **32 ingressos pagos** onde `valor_bruto` não bate com o valor base do item.
- Existem **36 checkouts mistos** com ingressos + produtos; neles ainda há contaminação histórica.
- Exemplos confirmados no banco:
  - Checkout `0797...`: 2 ingressos meia de R$20 + produto R$52 = pagamento Asaas R$92. Hoje os ingressos aparecem como **R$46 + R$46**, errado; deveriam somar **R$40** em ingressos e **R$52** em produtos.
  - Checkout `e1f6...`: 3 ingressos de R$40 + produto R$40 = pagamento Asaas R$160. Hoje os ingressos aparecem como **R$53,34/R$53,33/R$53,33**, errado; deveriam somar **R$120** em ingressos e **R$40** em produtos.
  - Há compras parceladas da excursão onde `preco` é R$240 e `preco_parcelado` é R$260. Nesses casos, bruto R$260 pode ser correto quando o comprador escolheu cartão parcelado; o problema é quando valor de outro item/checkout vaza para o ingresso.

## Causa raiz

1. O cálculo de eventos ainda depende de caminhos diferentes para achar pagamento Asaas: `paymentId`, `installmentId`, `externalReference` ou `checkout_id`.
2. Em checkouts mistos, o pagamento Asaas representa o checkout inteiro; se o cálculo processa só ingressos, o produto pode vazar para o bruto do ingresso.
3. O backfill atual chama muito a API Asaas e já bateu limite 429, então parte do histórico ficou sem corrigir.
4. Produtos e eventos têm lógicas parecidas, mas não usam um rateio central único; isso facilita uma tela ficar certa e outra não.
5. A taxa por linha é um **rateio da taxa real da transação**. Em PIX, a Asaas cobra R$0,99 por pagamento; se há 2 ingressos, a linha pode receber R$0,49/R$0,50 por arredondamento. Isso precisa ficar explícito como “taxa rateada”, não como se fosse uma cobrança PIX individual.

## Regra contábil definitiva

Para cada checkout pago:

1. Buscar o pagamento Asaas correto pelo `checkout_id` como chave principal.
2. Somar o bruto real pago no Asaas.
3. Separar todos os itens locais do checkout:
   - ingressos, individualmente;
   - produtos, individualmente por pedido/linha.
4. Calcular a participação de cada item no checkout:
   - ingresso de R$40 em checkout de R$160 = 25%;
   - produto de R$40 em checkout de R$160 = 25%.
5. Gravar em cada linha:
   - `valor_bruto`: bruto individual do item, nunca o total do checkout inteiro;
   - `taxa_total`: taxa Asaas rateada proporcionalmente;
   - `valor_liquido`: `valor_bruto - taxa_total`.
6. Garantir reconciliação:
   - por linha: `bruto - líquido = taxa`;
   - por checkout: soma dos itens = pagamento Asaas;
   - por relatório: `Bruto - Líquido = Taxas`.

## Alterações planejadas

### 1. Centralizar o rateio financeiro

Criar/ajustar um helper compartilhado para que eventos e produtos usem a mesma lógica:

- Fonte principal: `checkout_id`.
- Fonte de pagamentos:
  1. `asaas_webhook_events.payload.payment.checkoutSession`, quando existir;
  2. API Asaas como fallback;
  3. expansão de parcelas via `installmentId` quando for cartão parcelado.
- Fonte de itens:
  - `ingressos` pagos não-cortesia do checkout;
  - `pedidos_produtos` pagos/retirados do checkout.
- Resultado: um mapa de valores por item, separado por tipo (`ingresso` ou `produto`).

Arquivos envolvidos:

- `supabase/functions/_shared/financeiro.ts`
- `supabase/functions/_shared/produtos-financeiro.ts`
- possivelmente novo helper em `supabase/functions/_shared/financeiro-rateio.ts`

### 2. Corrigir eventos

Atualizar `recomputeIngressosFinancials` para:

- não distribuir o pagamento inteiro só entre ingressos quando houver produtos no checkout;
- usar o rateio central por checkout;
- continuar suportando pagamentos antigos por `paymentId`, `installmentId` e `externalReference`;
- preservar `taxa_manual` quando existir;
- zerar cortesias corretamente.

### 3. Corrigir produtos com a mesma regra

Atualizar `recomputePedidosProdutos` para:

- usar o mesmo rateio central;
- impedir que ingressos vazem para produtos;
- manter consistência nos checkouts mistos.

### 4. Tornar o backfill confiável

Atualizar `backfill-financeiro` para:

- agrupar por `checkout_id`;
- usar primeiro os webhooks já gravados, reduzindo chamadas à Asaas;
- adicionar pausa e retry com backoff para evitar 429;
- aceitar modo seguro para reprocessar apenas divergências primeiro;
- retornar detalhes úteis: checkouts corrigidos, sem pagamento localizado, erros e rate-limit.

Também revisar `backfill-produtos-financeiro` para seguir o mesmo padrão.

### 5. Ajustar relatórios e exportação

Em `relatorio-vendas` e `EventosRelatorio.tsx`:

- manter uma linha por ingresso individual;
- mostrar taxa como **taxa rateada**;
- incluir `checkout_id` no CSV para auditoria;
- garantir que os cards usem apenas valores reconciliados;
- manter aviso para registros pendentes ou não reconciliados.

Também revisar:

- `supabase/functions/relatorio-produtos/index.ts`
- `src/pages/ProdutosRelatorio.tsx`
- `supabase/functions/resumo-diario-vendas/index.ts`

para não deixar outro relatório somando dados antigos de forma diferente.

### 6. Validação com dados reais

Depois da implementação, validar no banco:

- Checkout `0797...`:
  - ingressos somam R$40;
  - produtos somam R$52;
  - total soma R$92;
  - taxa total do checkout soma R$0,99.
- Checkout `e1f6...`:
  - ingressos somam R$120;
  - produtos somam R$40;
  - total soma R$160;
  - taxa total do checkout soma R$0,99.
- Todos os registros pagos:
  - `valor_bruto - valor_liquido - taxa_total = 0` por linha;
  - `sum(valor_bruto) - sum(valor_liquido) = sum(taxa_total)` no relatório;
  - nenhum checkout misto com produto vazando para ingresso;
  - nenhum PIX simples com bruto diferente do item vendido sem justificativa.

## Resultado esperado

O relatório financeiro passará a ser confiável para repasse: cada ingresso/produto aparecerá individualmente, com bruto correto do item, taxa rateada e líquido reconciliado com o pagamento real da Asaas.