## Diagnóstico do caso CPF 25519771855 (Gerson Fonseca Da Cruz)

3 ingressos no banco (todos `user_id = 899cdbf6…`, evento `d1ed4d8c…`):

| Participante | tipo | status atual | checkout_id | asaas_payment_id | valor |
|---|---|---|---|---|---|
| Manuella (aluno) | inteira | **pago** | ee734ae5… (compra de 09/05) | — | 240 |
| Edileia (convidado) | inteira | **cancelado** ❗ | 4bb600ee… | pay_52gwl0uwfps6c8as | 30 |
| Gerson (convidado) | inteira | **cancelado** ❗ | fb8ca0d5… | pay_uiu6sj1s21dqb83h | 30 |

Os 2 ingressos cancelados foram **efetivamente pagos** (têm `data_pagamento`, `valor_liquido = 29.01`, `email_confirmacao_enviado_em`), mas estão como `cancelado` com `cancelado_em / cancelado_por / motivo_cancelamento = NULL`.

### Causa raiz (novo bug, diferente do caso Tais)

Sequência reconstruída pelos eventos do webhook:

1. **01:57** — usuário gerou checkout `b7a50a9a` com `externalReference = mix:ing=7dd30efb,e6740547;prod=551f09e8`. Ingressos criados como `pendente`.
2. **02:03 e 02:09** — usuário regerou o checkout 2× (`4bb600ee` e `fb8ca0d5`). O `checkout-evento-combo` sobrescreveu `checkout_id` dos ingressos para o checkout mais novo. Checkout `b7a50a9a` ficou órfão.
3. **02:12 e 02:17** — `PAYMENT_RECEIVED` chegou para os 2 checkouts mais novos. Webhook casou por `checkout_id` e marcou ambos os ingressos como **pago** (gravou `asaas_payment_id`, `valor_liquido`, mandou email).
4. **02:57** — Asaas disparou `CHECKOUT_EXPIRED` para o checkout órfão `b7a50a9a`. No webhook:
   - `newStatus = "pendente"` (mapa `CHECKOUT_STATUS_MAP`)
   - `externalRef = mix:ing=7dd30efb,e6740547;prod=...` (veio no payload do checkout)
   - Passo 1 (casa por `checkout_id = b7a50a9a`) não casou nada (já tinham sido sobrescritos).
   - **Passo 3 (fallback por ids do `externalRef`)** rodou — e o passo 3 agora roda SEMPRE que `externalRef` existe (mudança do caso Tais). Atualizou os 2 ingressos para `status='pendente'`, regravando `checkout_id = b7a50a9a`.
5. **~03:00** — `cancelar-pendentes` (cutoff 60 min, ingressos têm `created_at = 01:57`) pegou ambos e fez `UPDATE ingressos SET status='cancelado'`. Esse path não preenche `cancelado_em/por/motivo` — bate exatamente com o estado atual.

### O bug

O webhook **rebaixa ingressos já pagos para `pendente`** quando chega um `CHECKOUT_EXPIRED/CANCELED` de um checkout antigo do mesmo usuário. Em seguida, o `cancelar-pendentes` os cancela. O passo 3 do fallback, que rodamos "sempre" para corrigir o caso Tais, agravou o problema porque agora qualquer `externalRef` do payload propaga a mudança.

## Plano

### 1. Corrigir o caso Gerson (migração)
Reativar Edileia (`e6740547…`) e Gerson (`7dd30efb…`) como `pago`:
- `status = 'pago'`, `utilizado = false`
- Restaurar `checkout_id` correto de cada um (`4bb600ee…` e `fb8ca0d5…` respectivamente)
- Manter `asaas_payment_id`, `valor_bruto/líquido/taxa`, `data_pagamento` já existentes
- Limpar `cancelado_em/por/motivo_cancelamento` (já nulos)
- Não reenviar e-mail (já foram enviados em 31/05)

### 2. Webhook: não rebaixar ingressos pagos
Em `supabase/functions/asaas-webhook/index.ts`:
- Em **qualquer update** disparado por eventos de "downgrade" (`CHECKOUT_EXPIRED`, `CHECKOUT_CANCELED`, `PAYMENT_OVERDUE`), adicionar guarda `.not("status", "in", "(pago,estornado)")` em todos os passos (1, 2 e 3 do fallback). Ingresso já liquidado nunca volta para `pendente` por evento de expiração.
- O mesmo para `pedidos_produtos`.

### 3. Webhook: restringir o fallback do passo 3
- O passo 3 só deve atualizar `checkout_id` quando o evento for de **pagamento** (`PAYMENT_*`) ou `CHECKOUT_PAID`. Para `CHECKOUT_EXPIRED/CANCELED`, não regravar `checkout_id` em ingressos cujo `checkout_id` atual seja diferente (sinal de que já foram movidos para outro checkout).

### Detalhes técnicos
- Migração: `UPDATE ingressos SET status='pago' WHERE id IN ('7dd30efb…','e6740547…')`. Os campos financeiros já estão corretos.
- No `STATUS_MAP`/`CHECKOUT_STATUS_MAP`, marcar quais eventos são "downgrades" (vão para `pendente`) e aplicar a guarda `status NOT IN ('pago','estornado')` nas três queries de update do bloco de ingressos (e também no bloco de produtos).
- Não mexer no `cancelar-pendentes` — o comportamento dele (cancelar pendentes antigos) está correto; a falha foi a fonte que os marcou como pendente.

## Pergunta antes de implementar
Confirma que devo (a) reativar Edileia e Gerson como pagos e (b) aplicar as guardas no webhook para não rebaixar ingressos já pagos quando um checkout antigo expirar/cancelar?