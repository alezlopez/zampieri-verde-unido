## Objetivo

Dar ao admin visibilidade completa dos ingressos validados (utilizados) e produtos retirados — com data, hora e quem validou — e mostrar para o usuário final o status "utilizado" (ingressos) e "retirado" (produtos) com data/hora.

---

## 1. Painel admin de eventos (`EventosAdmin.tsx`)

Na lista de ingressos por evento (já existente), adicionar:

- Novos campos buscados: `utilizado`, `utilizado_em`, `utilizado_por`, `meia_validada_em`, `meia_validada_por`.
- Resolver `utilizado_por` / `meia_validada_por` via `user_profiles` para mostrar o nome.
- Em cada linha:
  - Badge verde **"✅ Utilizado"** com data/hora e nome do validador quando `utilizado=true`.
  - Para meia: data/hora e nome de quem validou o documento.
- Cards de resumo (acima da lista):
  - Total vendidos · Pagos · Utilizados · Pendentes de validação meia.
- Filtros rápidos:
  - "Apenas utilizados" / "Apenas não utilizados" (além do já existente "Meias não validadas").
- CSV: incluir colunas `utilizado`, `utilizado_em`, `validado_por`, `meia_validada_em`, `meia_validada_por`.

## 2. Relatório de eventos (`EventosRelatorio.tsx`)

- Adicionar colunas `utilizado` (Sim/Não) e `utilizado_em` na tabela de Detalhamento.
- Adicionar filtro por status de uso (Todos / Utilizados / Não utilizados).
- Card de totais: contagem de utilizados e taxa de comparecimento (%).
- Atualizar edge function `relatorio-vendas` para retornar esses campos e o totalizador.

## 3. Painel admin de produtos (`ProdutosAdmin.tsx`)

Hoje a listagem de pedidos não está visível neste painel. Adicionar (mesmo padrão dos eventos):

- Botão "Pedidos" por produto, abrindo lista com: comprador, variação, qtd, status, **retirado em** (data/hora) e **retirado por** (nome).
- Cards de resumo: Pagos · Retirados · Pendentes de retirada.
- Filtro: "Apenas retirados" / "Apenas pendentes de retirada".

## 4. Relatório de produtos (`ProdutosRelatorio.tsx`)

- Coluna "Retirado" passa a mostrar **data/hora** quando sim.
- Nova coluna "Retirado por" (nome do admin).
- Filtro por status de retirada (Todos / Retirados / Não retirados).
- Card de totais: já mostra `qtd_retirados` — adicionar % retirado.
- Atualizar edge function `relatorio-produtos` para retornar `retirado_por` (resolvido por `user_profiles`).

## 5. Visão do usuário final

**Ingressos** (`MeusIngressos.tsx` + `IngressoDetalhe.tsx`):
- Quando `utilizado=true`, mostrar badge verde "Utilizado em DD/MM/AAAA HH:MM" e ocultar/desabilitar o QR (já não serve mais).
- Adicionar `utilizado` e `utilizado_em` ao select e à interface.

**Produtos** (`MeusIngressos.tsx` aba Produtos + `ComprovanteProduto.tsx`):
- `ComprovanteProduto.tsx` já mostra "Retirado em …" quando `retirado_em` não é nulo. Apenas garantir que o card do `MeusIngressos` exiba o mesmo selo "Retirado em DD/MM HH:MM" quando aplicável (hoje só mostra status).

## 6. Detalhes técnicos

- Nenhuma alteração de schema. Todos os campos já existem:
  - `ingressos.utilizado`, `utilizado_em`, `utilizado_por`, `meia_validada_em`, `meia_validada_por`
  - `pedidos_produtos.retirado_em`, `retirado_por`
- Para resolver nomes dos validadores no admin: `supabase.from('user_profiles').select('user_id, username').in('user_id', ids)` — mesmo padrão usado em `ScannerIngressos.tsx`.
- Edge functions afetadas: `relatorio-vendas` e `relatorio-produtos` (apenas adicionar campos no `select` e join opcional via batch lookup em `user_profiles`).
- Sem mudanças de RLS necessárias.

## Arquivos a editar

- `src/pages/EventosAdmin.tsx`
- `src/pages/EventosRelatorio.tsx`
- `src/pages/ProdutosAdmin.tsx`
- `src/pages/ProdutosRelatorio.tsx`
- `src/pages/MeusIngressos.tsx`
- `src/pages/IngressoDetalhe.tsx`
- `supabase/functions/relatorio-vendas/index.ts`
- `supabase/functions/relatorio-produtos/index.ts`
