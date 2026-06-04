# Refatorar upsell do checkout de ingresso

## Mudanças (4 pontos)

### 1. Seleção de variações + nome customizado (admin + checkout)
Hoje, ao vincular um produto a um evento, **todas** as variações ativas aparecem no upsell. Vou permitir filtrar.

- **Schema** — adicionar em `evento_produtos`:
  - `variacoes_ids uuid[]` (NULL/vazio = todas as variações ativas; preenchido = apenas as escolhidas)
  - `nome_override text` (substitui o nome do produto no upsell, opcional)
  - `escassez_template text` (texto de escassez, opcional — placeholders `{disponiveis}` e `{vendidas}`)

- **Admin (`EventosAdmin.tsx`)** — na seção "Produtos vinculados", quando um produto é marcado:
  - Novo campo "Nome exibido no upsell" (texto livre, opcional).
  - Nova lista de checkboxes "Variações exibidas" (todas marcadas por padrão; desmarcar = ocultar aquela variação no upsell).
  - Novo campo "Texto de escassez" com placeholder `Apenas {disponiveis} disponíveis — {vendidas} já vendidas` e dica sobre os placeholders.

- **Checkout (`EventoCompra.tsx`)** — ao carregar `extrasDisponiveis`:
  - Filtrar variações pelo `variacoes_ids` se preenchido.
  - Usar `nome_override` (fallback para `produtos.nome`).
  - Mostrar texto de escassez logo abaixo do nome do produto, calculando estoque via RPC `contar_estoque_produto` para cada variação exibida e somando, OU usando o estoque da primeira variação. Como o estoque é por variação, mostrar o texto **por variação** (próximo ao nome dela) faz mais sentido — vou seguir essa abordagem.

### 2. Simplificar texto do upsell
Em `EventoCompra.tsx` linhas ~1047-1049, remover a segunda linha. Fica apenas:
`✨ Leve junto com seu ingresso`

### 3. Remover checkbox de termos
Substituir o bloco com `<Checkbox id="termos">` (linhas 1198-1216) por um texto simples:
`Ao prosseguir, você concorda com os Termos de Compra e Participação.` (com o link abrindo o popup já existente).

- Remover o estado `termosAceitos` / `setTermosAceitos`.
- Remover `!termosAceitos` da validação do botão Comprar (linha 1397) e do bloco de avisos (linha 1405-1407).
- Manter intacta a lógica de `autorizacaoAceita` (esse continua sendo opt-in obrigatório quando `evento.requer_autorizacao`).

### 4. Limpeza
- Nada além de `termosAceitos` precisa ser removido — o restante (`extrasSelecao`, `extrasDisponiveis`, etc.) continua sendo usado.
- `Produtos.tsx`, `CompraSucesso.tsx`, `EventoDetalhe.tsx` só leem `produto_id` de `evento_produtos`; as novas colunas não afetam essas páginas.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — adicionar 3 colunas em `evento_produtos`.
- `src/pages/EventosAdmin.tsx` — UI admin (campos de variações, nome_override, escassez).
- `src/pages/EventoCompra.tsx` — carregamento filtrado, exibição, remoção do checkbox de termos.
- `src/integrations/supabase/types.ts` — regenerado automaticamente pela migration.

## Compatibilidade

- Linhas existentes em `evento_produtos` ficam com `variacoes_ids = NULL` → comportamento atual preservado (todas as variações aparecem).
- `nome_override`/`escassez_template` NULL → fallback para nome do produto e nenhum texto extra.
- Nenhuma edge function precisa mudar (o checkout de ingresso usa `variacao_id` específico já selecionado pelo usuário).
