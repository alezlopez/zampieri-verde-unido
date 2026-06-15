## Problema

Ao escanear o QR de um produto, a RPC `marcar_produto_retirado` executa:

```sql
UPDATE pedidos_produtos SET status = 'retirado', retirado_em = now() ...
```

Mas o check constraint atual da tabela é:

```
CHECK (status = ANY (ARRAY['pendente','pago','cancelado','estornado']))
```

Faltou `'retirado'`. Por isso o Postgres rejeita o UPDATE com a mensagem que aparece no app. O scanner de ingressos funciona porque `ingressos` usa colunas próprias (`utilizado`, `utilizado_em`) — não altera `status`.

Várias outras partes do sistema já assumem que `'retirado'` é válido (relatórios de produtos, contagem de estoque, trigger `validar_estoque_pedido_produto`, função `get_comprovante_produto`), então o constraint está fora de sincronia com o resto do código.

## Correção (1 migração, sem mudança de código)

Recriar o constraint incluindo `'retirado'`:

```sql
ALTER TABLE public.pedidos_produtos
  DROP CONSTRAINT pedidos_produtos_status_check;

ALTER TABLE public.pedidos_produtos
  ADD CONSTRAINT pedidos_produtos_status_check
  CHECK (status = ANY (ARRAY['pendente','pago','cancelado','estornado','retirado']));
```

## Por que é seguro

- Não altera nenhum dado existente (linhas atuais já são `pendente/pago/cancelado/estornado` e seguem válidas).
- Não muda nenhuma lógica de aplicação, RLS, RPC ou edge function — só amplia o conjunto permitido.
- Não afeta o scanner de ingressos (tabela diferente).
- Após a migração, `marcar_produto_retirado` passa a concluir o UPDATE e o fluxo de "ja_retirado / ok" da RPC volta a funcionar normalmente.

## Validação pós-deploy

1. Escanear um QR de produto pago → deve retornar `ok` e marcar `retirado_em`.
2. Escanear o mesmo QR de novo → deve retornar `ja_retirado` (sem erro de constraint).
3. Conferir em `Eventos → Relatório` / `Produtos` que pedidos retirados continuam contabilizados como pagos no líquido (lógica já trata `'pago' || 'retirado'`).
