

## Plano: Adicionar status "estornado" com link de comprovante

### Alterações no banco de dados (migration)
1. Adicionar coluna `comprovante_estorno_url` (text, nullable) na tabela `ingressos`

### Alterações no frontend

**`src/pages/MeusIngressos.tsx`**
- Adicionar cor para status `estornado` no mapa `statusColors` (ex: roxo/purple)
- Quando `status === "estornado"` e `comprovante_estorno_url` existir, exibir botão "Ver Comprovante de Estorno" que abre o link em nova aba
- Incluir `comprovante_estorno_url` no select da query

**`src/pages/IngressoDetalhe.tsx`**
- Tratar status `estornado` similar ao fluxo de "não pago": exibir tela informativa com ícone e mensagem "Ingresso Estornado", com botão para ver o comprovante quando disponível
- Incluir `comprovante_estorno_url` no select da query

### Resumo de arquivos

| Arquivo | Mudança |
|---|---|
| Migration SQL | `ALTER TABLE ingressos ADD COLUMN comprovante_estorno_url text` |
| `src/pages/MeusIngressos.tsx` | Novo status visual + botão comprovante |
| `src/pages/IngressoDetalhe.tsx` | Tela de estorno + link comprovante |

