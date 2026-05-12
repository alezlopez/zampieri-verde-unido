Plano para garantir o funcionamento do Checkout Asaas sem mexer nos hooks:

1. Corrigir a criação do checkout no backend
- Ajustar `minutesToExpire` para o limite oficial do Asaas: entre 10 e 1440 minutos. O erro atual vem de `2880`, que a API rejeita.
- Incluir `expiredUrl` no `callback`, pois a documentação lista `cancelUrl`, `expiredUrl` e `successUrl` como obrigatórios/esperados.
- Garantir que os `items` sempre tenham `name`, `description`, `quantity` e `value`, com fallback seguro para nome do evento/ingresso.
- Manter o fluxo atual da tela: à vista envia para checkout com PIX + cartão; parcelado envia cartão com parcelamento.

2. Ajustar a modelagem do checkout conforme documentação Asaas
- Para à vista: usar `billingTypes: ["PIX", "CREDIT_CARD"]` e `chargeTypes: ["DETACHED"]`.
- Para parcelado: usar `billingTypes: ["CREDIT_CARD"]` e `chargeTypes: ["DETACHED", "INSTALLMENT"]`, com `installment.maxInstallmentCount` limitado ao máximo do evento.
- Não alterar hooks nem o frontend; a chamada atual já passa `pix` para à vista e `credit_card` para parcelado.

3. Atualizar o webhook para eventos de Checkout
- O webhook atual só processa eventos `PAYMENT_*` e procura `payload.payment.externalReference`.
- O Checkout Asaas também envia `CHECKOUT_CREATED`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED` e `CHECKOUT_PAID`, com dados em `payload.checkout`.
- Implementar suporte a:
  - `CHECKOUT_PAID` → marcar ingressos como `pago`.
  - `CHECKOUT_CANCELED` e `CHECKOUT_EXPIRED` → manter/voltar ingressos para `pendente` ou `cancelado` conforme regra atual desejada. Para não mudar regra de negócio agressivamente, usarei `pendente` para expirado/cancelado se não houver pagamento confirmado.
- Casar os ingressos por `checkout_id` e também por `checkout.externalReference` quando disponível.

4. Validar logs e testes do edge function
- Conferir logs recentes depois do ajuste para confirmar que o erro de `minutesToExpire` sumiu.
- Testar o formato do payload do checkout no código antes de considerar concluído.
- Avisar explicitamente quais eventos precisam estar habilitados no painel/webhook do Asaas: `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`, além dos eventos `PAYMENT_*` já usados.

Observação importante: provavelmente você precisa atualizar a configuração do webhook no Asaas para incluir os eventos de Checkout, porque o webhook atual registrado parece estar recebendo apenas `PAYMENT_*`.