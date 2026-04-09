

## Plano: Variação de Preço (À Vista, Parcelado, Parcelas)

### 1. Migração no banco de dados

Adicionar duas colunas na tabela `eventos`:

```sql
ALTER TABLE public.eventos ADD COLUMN preco_parcelado numeric NOT NULL DEFAULT 0;
ALTER TABLE public.eventos ADD COLUMN max_parcelas integer NOT NULL DEFAULT 1;
```

- `preco` existente passa a ser o **preço à vista**
- `preco_parcelado` = valor total parcelado
- `max_parcelas` = número máximo de parcelas (ex: 3, 6, 12)

### 2. Alterações no formulário admin (`EventosAdmin.tsx`)

- Renomear label "Preço (R$)" para "Preço à Vista (R$)"
- Adicionar campo "Preço Parcelado (R$)" (input numérico)
- Adicionar campo "Máximo de Parcelas" (input numérico)
- Incluir novos campos no payload de `handleSave`, `handleEdit` e `resetForm`
- Exibir info de parcelas na listagem admin

### 3. Alterações nas páginas públicas

- **`Eventos.tsx`**: Exibir "R$ X à vista ou Nx de R$ Y" nos cards
- **`EventoCompra.tsx`**: Mostrar opções de pagamento (à vista / parcelado) com radio buttons, exibindo o valor conforme seleção

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Nova migração SQL | Adicionar `preco_parcelado` e `max_parcelas` |
| `EventosAdmin.tsx` | Novos campos no formulário e interface |
| `Eventos.tsx` | Exibir preço à vista e parcelado |
| `EventoCompra.tsx` | Seleção de forma de pagamento |

