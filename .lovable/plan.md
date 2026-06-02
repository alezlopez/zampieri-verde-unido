## Diagnóstico

Encontrei os 4 ingressos da Tais Dos Santos Alves (user `e041311d…`):

| Participante | tipo | status | checkout_id | valor |
|---|---|---|---|---|
| Bernardo Alves Ximenes (aluno) | cortesia | **pago** | — | 0 |
| Tais Dos Santos Alves | inteira | **pago** | `54eb036b…` | 40 |
| Tarcísio Ximenes | inteira | **cancelado** | `6a6cc4ad…` | 40 |
| Ivanice Eleoterio dos Santos | inteira | **cancelado** | `9233f06d…` | 40 |

E 1 pedido de produto: 2× "Todas as rodas" R$104, status pago, checkout `54eb036b…`.

O pagamento no Asaas (`pay_ul0c01pem4z29ftn`) veio com `value: 224` (= 3 ingressos × 40 + 2 produtos × 52) e `checkoutSession: 54eb036b…`. O `externalReference` veio **null** no payload do pagamento.

### Causa raiz

O webhook `asaas-webhook` casa ingressos por `checkout_id` (igual ao `checkoutSession` do Asaas). Mas no banco só **1 ingresso** (Tais) está com o `checkout_id` `54eb036b…`. Os outros 2 ficaram com `checkout_id` antigos (de checkouts gerados anteriormente e nunca sobrescritos).

Provável fluxo do usuário: gerou checkout(s) para Tarcísio e Ivanice em momentos separados, depois clicou de novo e o `checkout-evento-combo` criou o checkout final `54eb036b…` incluindo todos os 3 ingressos no Asaas, mas **só atualizou no banco** os ingressos que estavam no array `ingresso_ids` daquela chamada (aparentemente só Tais). Os outros 2 mantiveram `checkout_id` órfão → webhook não os encontrou → ficaram pendentes → `cancelar-pendentes` cancelou.

O fallback por `externalReference` não salvou porque o Asaas não devolveu esse campo no payload de PIX.

## Plano

### 1. Corrigir o caso da Tais (manual, via migração)
Atualizar os 2 ingressos (Tarcísio e Ivanice) para `status='pago'`, gravar `asaas_payment_id='pay_ul0c01pem4z29ftn'`, `checkout_id='54eb036b…'`, `data_pagamento`, `valor_total=40`, e recalcular `valor_bruto/líquido/taxa` proporcional (via `recomputeIngressosFinancials` ou rateio simples). Em seguida, disparar `enviar-confirmacao-ingresso` para esses 2 ingressos.

### 2. Prevenir reincidência no webhook
Quando o webhook recebe um `PAYMENT_RECEIVED` com `checkoutSession` e o match por `checkout_id` retorna **menos itens do que o valor pago indica** (ou retorna zero ingressos quando o valor > soma do que casou), consultar a API do Asaas em `GET /v3/checkouts/{checkoutSession}` para ler o `externalReference` real do checkout e usar como fallback (já há código que parseia `mix:ing=…;prod=…`).

### 3. Prevenir reincidência no checkout-evento-combo / asaas-create-checkout
Antes de criar um novo checkout, **invalidar (`checkout_id=null`, `checkout_url=null`)** todos os ingressos pendentes do mesmo `user_id + evento_id` que **não** estão no array da requisição atual. Assim eles não ficam "atrelados" a um checkout antigo que o usuário nunca pagará, e o `cancelar-pendentes` ainda os cancela depois.

### Detalhes técnicos
- Item 1: migração SQL `UPDATE ingressos SET … WHERE id IN (…)` + invoke da função de e-mail via `curl` da edge function.
- Item 2: nova chamada `asaasGet(/v3/checkouts/{id})` em `supabase/functions/_shared/asaas.ts` + uso no `asaas-webhook/index.ts` antes do passo 3 do fallback.
- Item 3: `UPDATE ingressos SET checkout_id=null, checkout_url=null WHERE user_id=$u AND evento_id=$e AND status='pendente' AND id NOT IN ($ids)` no início de `asaas-create-checkout` e `checkout-evento-combo`.

## Pergunta antes de implementar
Confirma que devo (a) reativar os 2 ingressos cancelados da Tais (Tarcísio e Ivanice) como pagos e reenviar os comprovantes, e (b) aplicar as correções 2 e 3 para prevenir o problema?