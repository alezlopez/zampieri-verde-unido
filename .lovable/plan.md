## O que está errado

Evento: **Excursão - Aquário de São Paulo** (id `87f20c66...`).
Preços corretos: inteira R$ 240 à vista / R$ 260 parcelado · meia R$ 120 / R$ 130.

Encontrei **16 ingressos pagos** com `valor_bruto = 35` e `valor_liquido = 31,79`.
Todos os 16:
- pertencem a **16 usuários diferentes**;
- vieram de **16 checkouts diferentes**;
- mas compartilham o **mesmo `asaas_payment_id`** (`bbfddd93-72d9-4430-99ae-f903a71da20a`);
- somados, dão exatamente **R$ 560 → 560 / 16 = 35**.

Ou seja: o sistema pegou **uma única cobrança Asaas de R$ 560** (provavelmente um parcelamento de 16× ou um único pagamento) e **distribuiu proporcionalmente entre 16 ingressos que não deveriam estar associados a ela**. Como `valor_total` desses ingressos está `NULL`, o rateio caiu no fallback "1/N" e gerou R$ 35 para cada.

## Causa raiz no código

Em `supabase/functions/_shared/financeiro.ts → recomputeIngressosFinancials`:

1. `loadIngressos` aceita carregar por `asaas_payment_id` (quando só vem `paymentId`/`installmentId`). Se vários ingressos de checkouts diferentes já carregam o mesmo id, ele puxa todos juntos.
2. Em seguida, ao final, faz `update ... eq("id", ing.id)` gravando `asaas_payment_id = stableId` em todos eles — propagando o vínculo errado.

E em `supabase/functions/asaas-webhook/index.ts` (passo 2, linha ~136-144), quando o match por `checkout_id` falha (ex.: webhook de evento sem checkoutId, ou backfill), ele faz `update ... eq("asaas_payment_id", stableId)` **sem restringir ao checkout** — tagueando ingressos de outros compradores com o mesmo id. A partir desse ponto, qualquer reprocesso "contagia" mais ingressos.

Provável gatilho histórico: rodada do `backfill-financeiro` ou um webhook de um comprador parcelado (16× × 35 = 560) que escapou do match por checkoutId e caiu no `eq(asaas_payment_id)` — ou o `externalRef` colou ids de ingressos que não eram desse pagamento.

## Plano de correção

### 1. Blindar o webhook (`asaas-webhook/index.ts`)
- No passo 2 (match por `asaas_payment_id`), exigir também `checkout_id` quando disponível, ou ignorar o passo se não houver `checkoutId` confiável.
- Nunca fazer update em massa por `asaas_payment_id` sem confirmar que todos os ingressos pertencem ao mesmo `checkout_id`/`user_id`.

### 2. Blindar o recompute (`_shared/financeiro.ts`)
- `loadIngressos`: quando carregar por `asaas_payment_id`, validar que todos os retornados compartilham o mesmo `checkout_id`. Se não, abortar com log e exigir `checkoutId` ou `ingressoIds` explícitos.
- Só sobrescrever `asaas_payment_id` quando o ingresso ainda não tiver um, ou quando o novo for igual ao antigo.

### 3. Limpeza dos 16 ingressos afetados
Para cada um dos 16 ids:
- Zerar `asaas_payment_id`, `valor_bruto`, `valor_liquido`, `taxa_total`, `data_pagamento`, `data_credito`.
- Recompor `valor_total` a partir do `tipo_ingresso` + preço do evento (240 / 120 / 260 / 130 conforme parcelas).
- Reexecutar o recompute **escopado por `checkout_id`** (um por vez) para reatribuir o pagamento Asaas correto de cada compra.
- Validar manualmente os 1–2 compradores cujo pagamento real era o `bbfddd93...` (provavelmente um parcelamento 16×R$35 — confirmar no painel Asaas que ingresso é o legítimo dono).

### 4. Auditoria preventiva
Rodar uma query de sanidade depois do fix:
```sql
select asaas_payment_id, count(distinct checkout_id) as checkouts, count(*) as ingressos
from ingressos
where asaas_payment_id is not null
group by 1
having count(distinct checkout_id) > 1;
```
Qualquer linha retornada indica outro caso do mesmo bug e precisa do mesmo tratamento.

### 5. (Opcional) Mesma blindagem em produtos
`supabase/functions/_shared/produtos-financeiro.ts` segue padrão idêntico — aplicar a mesma proteção para evitar que o problema apareça em `pedidos_produtos`.

## Observação importante

Antes de corrigir os dados, precisamos identificar **qual comprador realmente pagou** o `bbfddd93...` no Asaas (consulta direta no painel ou via API `getInstallment/getPayment`), para não apagar o vínculo legítimo. Posso rodar essa consulta no Asaas e listar exatamente qual checkout é o dono antes de você aprovar a limpeza.