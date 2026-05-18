# Cancelamento + Estorno pelo Admin

Permitir que o admin, direto no Relatório de Eventos (e no Relatório de Produtos), cancele um ingresso/pedido pago e dispare o estorno automático no Asaas.

## Fluxo do usuário

1. Na tabela de Detalhamento (EventosRelatorio / ProdutosRelatorio), cada linha ganha um botão "Cancelar e estornar" (ícone lixeira/ban) ao lado do botão de editar taxa.
2. Botão abre um diálogo de confirmação mostrando:
   - Comprador, evento/produto, valor bruto, forma de pagamento e parcelas.
   - Campo obrigatório "Motivo do cancelamento".
   - Aviso: "Esta ação solicita estorno integral no Asaas e libera as vagas. Não é reversível."
3. Ao confirmar, chama nova edge function `cancelar-ingresso` (ou `cancelar-pedido-produto`).
4. Após sucesso: status vira `estornado`, badge na tabela, vagas liberadas pelo trigger existente, e o link do comprovante (quando o Asaas devolve) é salvo em `comprovante_estorno_url` — já exibido em `IngressoDetalhe`.

## Regras de negócio

- **Cortesia / sem pagamento Asaas**: apenas marca `status = 'cancelado'` (sem chamar Asaas). Vagas são liberadas pelo trigger.
- **PIX / Cartão à vista** (1 pagamento): chama `POST /payments/{id}/refund` no Asaas com `value` total e `description = motivo`.
- **Cartão parcelado** (installment): chama refund em cada `payment` da parcela que esteja em status pago (`CONFIRMED`/`RECEIVED`). Os pendentes futuros são cancelados via `DELETE /payments/{id}` (não há valor a estornar).
- **Boleto pago**: mesmo refund.
- Se algum refund falhar, aborta e retorna erro (não marca como estornado parcialmente).
- Grava no ingresso: `status = 'estornado'`, `motivo_cancelamento`, `cancelado_em`, `cancelado_por` (uuid do admin), `comprovante_estorno_url` (do retorno do Asaas, quando houver).
- Webhook `PAYMENT_REFUNDED` do Asaas já é tratado de forma idempotente — se chegar depois, não duplica.

## Mudanças técnicas

### 1. Migração
Adicionar em `ingressos` e `pedidos_produtos`:
- `motivo_cancelamento text`
- `cancelado_em timestamptz`
- `cancelado_por uuid`

(Status `estornado` e `cancelado` já existem como valores texto, não precisa enum.)

### 2. Helper Asaas (`supabase/functions/_shared/asaas.ts`)
Adicionar:
- `refundPayment(paymentId, { value?, description? })` → `POST /payments/{id}/refund`
- `deletePayment(paymentId)` → `DELETE /payments/{id}` (para parcelas futuras não pagas)

### 3. Edge functions novas
- `supabase/functions/cancelar-ingresso/index.ts`
- `supabase/functions/cancelar-pedido-produto/index.ts`

Cada uma:
- Valida admin (via `has_role`).
- Carrega o registro + lista de pagamentos do `asaas_payment_id`/installment.
- Aplica refund/delete por pagamento conforme status.
- Atualiza a tabela com status `estornado`, motivo, autor, timestamp e `comprovante_estorno_url`.

### 4. Frontend
- Novo componente `CancelarIngressoDialog.tsx` (reusável para ingresso/pedido) com motivo + confirmação dupla.
- Em `EventosRelatorio.tsx` e `ProdutosRelatorio.tsx`: botão ícone "Cancelar/Estornar" na coluna de ações; oculto se status já for `estornado`/`cancelado`.
- Após sucesso, refaz o `fetchRelatorio()`.

### 5. Vagas
O trigger `atualizar_vagas_disponiveis` já reage à mudança de status — nada a fazer.

## Fora do escopo
- Estorno parcial (valor menor que o total).
- Reembolso manual sem Asaas (caso de pagamento offline) — pode virar follow-up.
