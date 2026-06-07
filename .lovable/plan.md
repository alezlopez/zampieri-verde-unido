
## Diagnóstico

Dois problemas distintos provocam os números errados que você está vendo.

### 1. Bruto inflado em checkouts mistos (ingressos + produtos)

Em `supabase/functions/_shared/financeiro.ts` (`recomputeIngressosFinancials`), quando um checkout vende ingresso E produto, o `bruto` lido do Asaas é o pagamento inteiro (ingresso + produto), mas o rateio é distribuído **somente entre os ingressos**. Resultado: o valor dos produtos vaza para o bruto dos ingressos.

É o espelho exato do bug que já corrigimos em `produtos-financeiro.ts`. Hoje no banco:

- Soma `valor_total` (preço real dos ingressos pagos não-cortesia): **R$ 38.090,00**
- Soma `valor_bruto` calculado: **R$ 39.574,00** → **R$ 1.484,00 inflados** por produtos do mesmo checkout

### 2. Cards "Bruto / Líquido / Taxas" não fecham

No print: Bruto 14.224 − Líquido 11.792,36 = **2.431,64**, mas o card "Taxas" mostra **281,64** (1,98%). Isso acontece porque, em `supabase/functions/relatorio-vendas/index.ts` (linhas 142–178), o `bruto` total inclui ingressos pagos cujo líquido ainda não foi calculado, enquanto `liquido` e `taxa` só somam ingressos com líquido pronto. A função já calcula `bruto_liquido_pendente` e `qtd_liquido_pendente`, mas o UI nunca exibe essa distinção.

### 3. O que já está OK

- `relatorio-vendas` já retorna **uma linha por ingresso** em `lista` (mesmo quando vieram do mesmo checkout). A tabela em `EventosRelatorio.tsx` (linhas 445+) já mostra ingresso a ingresso.
- `relatorio-produtos` + `ProdutosRelatorio.tsx` já fazem o mesmo para pedidos de produtos.

Ou seja, o requisito de "1 linha por ingresso / 1 linha por produto, mesmo no mesmo checkout" **já existe** — o que falta é os valores fecharem.

## Plano

### A) Corrigir contaminação em `_shared/financeiro.ts`

Aplicar o mesmo padrão que já está em `_shared/produtos-financeiro.ts`:

1. Após somar `bruto` e `liquido` dos pagamentos Asaas, quando houver `checkoutId` (ou conseguirmos derivar via `paymentId`/`installmentId`), buscar os `pedidos_produtos` pagos do mesmo `checkout_id` e somar `valor_total`.
2. Calcular `denomSum = ingressosSum + produtosSum`.
3. Se `denomSum > ingressosSum`, escalar `bruto`/`liquido` pela participação dos ingressos: `share = ingressosSum / denomSum`, `brutoIng = bruto * share`, `liquidoIng = liquido * share`.
4. Distribuir apenas `brutoIng`/`liquidoIng` entre os ingressos (loop atual a partir da linha 175 usando `brutoIng` em vez de `bruto`).

Isso isola o financeiro dos ingressos do dos produtos sem mexer no checkout, webhook, criação de pagamento ou RLS.

### B) Cards de totais que fecham em `relatorio-vendas` + `EventosRelatorio.tsx`

Mudar a forma como os 3 cards apresentam os totais para que **sempre** reconcilie:

- **Bruto exibido** = soma de `valor_bruto` apenas dos ingressos com `valor_liquido` calculado (`brutoComLiquido`, que já é calculado no backend, linha 182).
- **Líquido** = `tot.liquido` (igual a hoje).
- **Taxas** = `tot.taxa` (igual a hoje) — agora sempre = Bruto − Líquido.
- Abaixo dos cards, adicionar uma linha discreta tipo "X ingresso(s) pago(s) aguardando cálculo de líquido — R$ Y,YY em bruto" usando `qtd_liquido_pendente` e `bruto_liquido_pendente` (já vêm do backend). Isso preserva a transparência sem misturar números que não se reconciliam.

Nenhuma mudança na tabela linha-a-linha — ela continua mostrando ingresso por ingresso.

### C) Mesmo tratamento no `ProdutosRelatorio`

Conferir e replicar o mesmo padrão de cards em `relatorio-produtos/index.ts` + `ProdutosRelatorio.tsx`, para que o card de Taxas também sempre feche Bruto − Líquido lá. A tabela linha-a-linha já está OK desde o ajuste anterior.

### D) Backfill histórico após (A)

Rodar `backfill-financeiro` (ingressos) com `force=true` — análogo ao que já fizemos para produtos — para reprocessar os 514 ingressos pagos com a nova lógica. Como o `EventosRelatorio.tsx` já tem o botão "Reprocessar valores" (admin only), basta clicar nele uma vez após a função ser publicada.

### E) Linha 1 por ingresso/produto sempre (verificação)

Nada a alterar: a query em `relatorio-vendas` (linha 54) já é `from("ingressos")`, ou seja, uma linha por ingresso individual, com `valor_bruto`/`valor_liquido`/`taxa_total` por linha. O mesmo vale para `relatorio-produtos`. Se você quiser também exportar/exibir `nome_participante` em destaque (já existe na coluna), posso ajustar a tabela para ressaltar isso.

## Resumo técnico (arquivos tocados)

- `supabase/functions/_shared/financeiro.ts` — desconta produtos do bruto/líquido em checkout misto.
- `supabase/functions/relatorio-vendas/index.ts` — expor `bruto_reconciliado` (= bruto com líquido) e manter `bruto`/`bruto_liquido_pendente` separados.
- `src/pages/EventosRelatorio.tsx` — cards Bruto/Líquido/Taxas usam `bruto_reconciliado`; adicionar nota de pendentes.
- `supabase/functions/relatorio-produtos/index.ts` + `src/pages/ProdutosRelatorio.tsx` — mesmo tratamento de cards.
- **Nada** alterado em: checkout, webhook, criação de pagamento, ingressos/produtos, RLS, comprovantes, e-mails.

Depois de aplicar (A), você roda o "Reprocessar valores" em Eventos > Relatório uma vez para limpar o histórico.
