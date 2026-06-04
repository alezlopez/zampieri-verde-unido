## Mudança: nome de exibição por variação

Hoje o `nome_override` em `evento_produtos` é um único texto que substitui o nome do produto inteiro no upsell. Vou trocar por um mapa de overrides por variação.

### Schema
Adicionar coluna em `evento_produtos`:
- `nomes_override_variacoes jsonb` — objeto `{ "<variacao_id>": "Nome customizado" }`. NULL/vazio = usa nome padrão da variação.

Manter `nome_override` (texto) para compatibilidade, mas deixar de usar no admin/checkout (ou removê-lo — ver pergunta abaixo).

### Admin (`EventosAdmin.tsx`)
Na seção de vínculo de produto:
- Remover o campo único "Nome exibido no upsell".
- Para cada variação marcada na lista "Variações exibidas", mostrar ao lado um input "Nome no upsell" (placeholder = nome real da variação). Vazio = mantém nome original.

### Checkout (`EventoCompra.tsx`)
Ao montar `extrasDisponiveis`, para cada variação exibida usar `nomes_override_variacoes[variacao.id]` se existir; senão usar `produtos.nome - variacao.nome` como hoje.

### Compatibilidade
- Linhas existentes ficam com `nomes_override_variacoes = NULL` → comportamento atual.
- Vínculos que já tinham `nome_override` preenchido: ignorados (ou migrados — ver pergunta).

### Arquivos
- nova migration adicionando a coluna jsonb
- `src/pages/EventosAdmin.tsx` (UI de inputs por variação)
- `src/pages/EventoCompra.tsx` (resolução do nome por variação)
