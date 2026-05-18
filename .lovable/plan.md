## Objetivo

Corrigir o cálculo do líquido usando as taxas reais da sua conta Asaas e permitir override manual da taxa pelo admin diretamente nos relatórios.

## Parte 1 — Atualizar fórmula automática (taxas reais)

Hoje o sistema usa 2,15% / 2,60% como antecipação cheia. Vou ajustar `_shared/financeiro.ts` e `_shared/produtos-financeiro.ts` para usar as taxas que você confirmou:

**Taxa da cobrança (transação):**
- PIX: R$ 0,99 fixo
- Cartão à vista: 2,9% + R$ 0,29
- Cartão 2–6x: 3,49% + R$ 0,29
- Cartão 7–12x: 3,99% + R$ 0,29
- Boleto: mantém `value − netValue` do Asaas

**Taxa de antecipação (proporcional aos dias entre solicitação e vencimento da parcela):**
- À vista: 2,15% × (dias/30) sobre o valor da parcela
- Parcelado: 2,60% × (dias/30) sobre o valor da parcela (somando todas as parcelas)
- Base de dias: `paymentDate` (ou `confirmedDate`) até `dueDate` de cada parcela. Se faltar data, usa 30 dias para à vista e N×30 para parcela N.

Líquido = bruto − taxa_transacao − taxa_antecipacao.

Isso bate com o seu exemplo: R$ 240 → 7,25 + 5,34 = 12,59 → líquido R$ 227,41.

## Parte 2 — Override manual no admin

### Schema
Adicionar em `ingressos` e `pedidos_produtos`:
- `taxa_manual` (numeric, nullable) — taxa total inserida pelo admin
- `taxa_manual_em` (timestamptz, nullable)
- `taxa_manual_por` (uuid, nullable)

Regra: se `taxa_manual` não for nula, o sistema usa ela como `taxa_total` e recalcula `valor_liquido = valor_bruto − taxa_manual`. O recompute automático passa a respeitar esse override (não sobrescreve).

### UI
Em **EventosRelatorio.tsx** e **ProdutosRelatorio.tsx**, na coluna "Taxa":
- Substituir o valor por um botão "editar" (ícone lápis) ao lado do valor atual.
- Abrir um dialog com:
  - Valor bruto (readonly)
  - Taxa calculada automaticamente (readonly, referência)
  - Input "Taxa manual (R$)" — vazio = usa cálculo automático
  - Botão "Salvar" e "Limpar override (usar automático)"
- Indicar visualmente quando a taxa é manual (badge "manual" pequeno ao lado do valor).

## Parte 3 — Backfill

Após aplicar a nova fórmula, rodar `backfill-financeiro` e `backfill-produtos-financeiro` com `force: true` para recalcular todos os registros pagos usando as taxas corretas. Registros com `taxa_manual` preenchida são preservados.

## Arquivos afetados

- Migration: adicionar `taxa_manual`, `taxa_manual_em`, `taxa_manual_por` em `ingressos` e `pedidos_produtos`
- `supabase/functions/_shared/financeiro.ts` — nova fórmula + respeitar override
- `supabase/functions/_shared/produtos-financeiro.ts` — idem
- `src/pages/EventosRelatorio.tsx` — UI de edição manual
- `src/pages/ProdutosRelatorio.tsx` — UI de edição manual

## Resultado esperado

- Janaina (R$ 240, cartão à vista, 32 dias antecipado) → taxa R$ 12,59, líquido R$ 227,41 ✅
- PIX R$ 240 → taxa R$ 0,99, líquido R$ 239,01 ✅
- Admin pode corrigir manualmente qualquer caso atípico direto no relatório.
