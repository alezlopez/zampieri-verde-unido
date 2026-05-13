## Diagnóstico

A lógica atual tenta recalcular o líquido buscando pagamentos no Asaas, mas falha em casos reais porque:

- Em checkout parcelado, os eventos `PAYMENT_CONFIRMED` vêm por parcela e nem sempre trazem `externalReference`; o vínculo confiável aparece em `payment.checkoutSession`, que hoje não é usado.
- O webhook recalcula passando `paymentId/installmentId`, mas o helper primeiro tenta localizar ingressos por `asaas_payment_id`; como o pagamento ainda não está vinculado aos ingressos, o cálculo pode retornar vazio.
- Para checkout parcelado, o `CHECKOUT_PAID` marca ingressos como pagos antes dos eventos de pagamento chegarem, deixando `valor_liquido` nulo até backfill.
- O relatório mostra líquido como `0` quando ainda está pendente, o que distorce totais.
- Há um problema separado de preço unitário: os dois ingressos da Flavia estão com `valor_total = 520` cada, mas o evento custa `260` parcelado por ingresso. O Asaas confirmou 4 parcelas de `130`, total bruto `520`, líquido `501,60`; isso deve ser distribuído como `260` bruto e `250,80` líquido por ingresso.

## Plano de implementação

1. **Fortalecer vínculo Asaas → ingressos**
   - Atualizar o helper financeiro para aceitar `checkoutSession`/`checkout_id` vindo de `payload.payment.checkoutSession`.
   - Resolver ingressos por esta ordem segura: IDs explícitos, `checkout_id`, `externalReference`, `asaas_payment_id`.
   - Ao receber pagamento parcelado, gravar o ID do parcelamento (`installment`) em todos os ingressos daquele checkout para futuras sincronizações.

2. **Corrigir cálculo financeiro para PIX, cartão à vista e cartão parcelado**
   - Para PIX/cartão à vista: usar o pagamento único confirmado/recebido e gravar `valor_bruto`, `valor_liquido`, `taxa_total`, `data_pagamento`, `data_credito`.
   - Para cartão parcelado: somar todas as parcelas confirmadas/recebidas do mesmo `installment`, sem duplicar eventos, e distribuir proporcionalmente pelos ingressos pagos.
   - Usar o payload do webhook como fonte imediata quando disponível, e consultar API Asaas como complemento quando necessário.

3. **Ajustar webhook sem quebrar fluxo atual**
   - Manter resposta 200 e idempotência.
   - Processar `CHECKOUT_PAID` apenas para status/e-mail, mas deixar financeiro ser consolidado pelos eventos `PAYMENT_CONFIRMED/RECEIVED`.
   - Nos eventos de pagamento, usar `checkoutSession` para localizar o checkout, mesmo quando `externalReference` vier nulo.

4. **Melhorar backfill/sincronização manual**
   - Atualizar `backfill-financeiro` para buscar também eventos pelo `checkoutSession` e recalcular grupos pagos com líquido nulo.
   - Permitir reprocessar grupos pagos com líquido nulo sem depender de `asaas_payment_id` já gravado.

5. **Corrigir relatório para não distorcer totais**
   - Marcar líquido pendente como pendente e não somar `0` como se fosse valor real.
   - Mostrar bruto com fallback em `valor_total`, mas líquido/taxa apenas quando calculados.
   - Manter filtros atuais e quebrar cartão em à vista/parcelado pela coluna `parcelas`.

6. **Correção de dados existentes necessária após validar a lógica**
   - Corrigir os dois ingressos da Flavia de `valor_total = 520` para `260` cada.
   - Recalcular financeiro do checkout `274c5bca-9721-4b8d-83c1-2fdee8c27234` para ficar: bruto total `520`, líquido total `501,60`, taxa total `18,40`, distribuído entre os dois ingressos.
   - Reprocessar os pagamentos já pagos com `valor_liquido` nulo usando a sincronização atualizada.

## Validação

- Consultar novamente os ingressos da Flavia para confirmar valores unitários e líquidos.
- Testar a função de relatório para confirmar que os totais não tratam líquido pendente como zero.
- Verificar logs das Edge Functions após deploy para garantir que webhook e backfill não geram erro.