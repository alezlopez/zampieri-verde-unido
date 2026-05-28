# Ajustes de responsividade mobile

Foco principal: painel admin e relatórios (problema relatado). Aproveitando, corrijo também os pontos de fricção mobile encontrados em outras rotas. **Nenhuma regra de negócio, fetch, validação ou fluxo será alterado** — só classes Tailwind de layout.

## Escopo (alta prioridade — admin/relatórios)

**`src/pages/EventosAdmin.tsx`**
- Toolbar do header com 5 botões (Relatório Eventos / Relatório Produtos / Produtos / Scanner QR / Novo Evento) hoje estoura no mobile. Adicionar `flex-wrap gap-2` e empilhar (`flex-col sm:flex-row`) quando necessário, com botões `w-full sm:w-auto`.
- KPI grid `grid-cols-2 md:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` (cards ficam apertados em 360px).

**`src/pages/EventosRelatorio.tsx`**
- Header com 3 botões grandes (Sincronizar líquidos / Forçar recálculo / Exportar CSV) sem `flex-wrap` — adicionar wrap e quebrar layout em mobile (título em cima, ações embaixo).
- Tabelas de breakdown ("Por evento" e "Por forma de pagamento") sem wrapper de scroll — envolver em `<div className="overflow-x-auto">`.
- Tabela principal de Detalhamento (10 colunas) — trocar `overflow-auto` por `overflow-x-auto` e garantir `min-w-0` no card pai.

**`src/pages/ProdutosRelatorio.tsx`**
- Mesmas correções de tabelas: envolver as 3 tabelas de breakdown em `overflow-x-auto`; tabela principal `overflow-auto` → `overflow-x-auto`.

**`src/pages/ProdutosAdmin.tsx`**
- Linha de variação com texto longo de preço + badges + 2 botões: adicionar `min-w-0` no texto e `shrink-0 flex-wrap` no grupo de ações.
- Header de ações com `flex-wrap gap-2`.

## Escopo (média prioridade — outras rotas)

**`src/pages/EventoCompra.tsx`**
- Form de convidado: `grid grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2` para CPF/Data nascimento e Email/Celular (em telas ≤375px ficam pequenos demais para digitar).

**`src/pages/EventoDetalhe.tsx`**
- CTA `sticky bottom-4` sobrepõe o último bloco em telas curtas — adicionar `pb-24` no `<article>` para garantir folga.

**`src/pages/Produtos.tsx`**
- Linha do produto: `min-w-0` no container de texto (evita overflow de nome longo).
- Linha de variação: `min-w-0` à esquerda, `shrink-0` no grupo de botões +/-.
- RadioGroup de pagamento: `flex-wrap`.

**`src/pages/MapadaSuaProximaGrandeAventura.tsx`**
- Normalizar `text-base` solto para `text-sm md:text-base` nos `FormLabel` para consistência (cosmético).

## Páginas verificadas e OK (sem alteração)

`Eventos.tsx`, `MeusIngressos.tsx`, `IngressoDetalhe.tsx`, `ComprovanteProduto.tsx`, `CompraSucesso.tsx`, `EventosLogin.tsx`, `ResetPassword.tsx`, `ScannerIngressos.tsx` — já responsivas.

## Garantias

- Apenas classes Tailwind de layout/spacing/overflow alteradas.
- Nenhum handler, query, RPC, validação ou rota alterado.
- Layout desktop preservado (todos os ajustes usam breakpoints `sm:`/`md:` mantendo o comportamento atual em ≥768px).
- Verificação visual pós-implementação em viewport mobile (375px) nas páginas alteradas.

## Detalhes técnicos

```text
Padrão aplicado a tabelas largas:
<Card>
  <CardContent className="p-0">
    <div className="overflow-x-auto">
      <Table className="min-w-[640px]">...</Table>
    </div>
  </CardContent>
</Card>

Padrão para toolbars de header:
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>título</div>
  <div className="flex flex-wrap gap-2">
    <Button className="w-full sm:w-auto">...</Button>
  </div>
</div>
```
