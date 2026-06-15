## Objetivo

No scanner, ao ler um QR de produto (`prod:<token>`), **não retirar automaticamente**. Mostrar primeiro um card com os dados do produto e exigir um clique de confirmação antes de marcar como retirado — mesma UX dos ingressos.

## Mudanças (apenas em `src/pages/ScannerIngressos.tsx`)

1. Novo estado `produto` (preview do pedido) ao lado de `ingresso` e `error`.
2. Em `handleScan`, quando o token começar com `prod:`:
   - Não chamar mais `marcar_produto_retirado`.
   - Chamar `supabase.rpc("get_comprovante_produto", { p_qr_token: token })` (RPC já existente — retorna produto, variação, quantidade, nome_comprador, status, evento, retirado_em).
   - Se status ≠ `pago` e ≠ `retirado` → `setError("Pagamento ainda não confirmado (...)")`.
   - Caso contrário → `setProduto(row)` (mostra o card).
3. Novo card de produto (renderizado quando `produto` existe):
   - Evento, produto, variação, quantidade (em destaque), comprador, status.
   - Se `status === 'retirado'`: banner vermelho "JÁ RETIRADO em <data>", sem botão de confirmar.
   - Se `status === 'pago'`: botão grande verde **"Confirmar retirada"** que chama `marcar_produto_retirado` e, em sucesso, exibe `toast.success` rápido ("Produto retirado!") e mantém o card mostrando o produto como retirado.
   - Botão "Escanear Outro" abaixo.
4. Ajustar `startScanner` / `stopScanner` para também limpar `produto`.
5. Toast continua usando `@/hooks/use-toast` (padrão atual do arquivo).

## Por que é seguro

- Não toca em RLS, edge functions, schema ou no fluxo de ingressos.
- `get_comprovante_produto` já existe e é SECURITY DEFINER (só leitura).
- `marcar_produto_retirado` continua igual — só passa a ser disparada por clique humano.
- Reaproveita o mesmo padrão visual de ingressos (Card + Badge + Button).
