# Valor pago das rematrículas concluídas aparece como R$ 0,00

## O que está acontecendo

Todas as rematrículas já concluídas estão com o valor pago vazio no banco (confirmado por consulta: 11 alunos concluídos, todos com `valor_pago` nulo). O painel mostra corretamente o que existe — o problema é que o valor nunca é gravado.

Causa confirmada nos eventos recebidos do Asaas: o evento que confirma essas rematrículas é o `CHECKOUT_PAID`, cujo conteúdo não traz `payment.value` nem `checkout.value`. O valor está dentro dos itens do checkout (`checkout.items[].value` x quantidade). Como o webhook só lê os dois primeiros campos, grava vazio. Pelo mesmo motivo, o identificador do pagamento também fica em branco.

## O que muda

1. **Webhook passa a calcular o valor corretamente** — quando o Asaas não enviar o valor direto, soma os itens do checkout. Vale para pagamentos futuros de rematrícula.
2. **Correção dos registros antigos** — preencher o valor pago das rematrículas já concluídas a partir dos eventos do Asaas já guardados no sistema, para o painel deixar de mostrar R$ 0,00.
3. **Painel** — quando ainda assim não houver valor conhecido, mostrar "Valor não informado" em vez de R$ 0,00, junto com a forma de pagamento e a data.

## Detalhes técnicos

- `supabase/functions/asaas-webhook/index.ts`, ramo `remat:`: substituir
  `Number(payload?.payment?.value ?? payload?.checkout?.value ?? 0)` por uma resolução em cascata — `payment.value` → `checkout.value` → soma de `checkout.items[]` (`value * (quantity ?? 1)`). Aplicar a mesma resolução ao gravar `valor_pago`. Nenhum outro ramo (ingressos, produtos, renegociação) é alterado.
- Migration de backfill: para cada linha de `alunos_rematricula_2027` com `rematricula_concluida = true` e `valor_pago is null`, buscar em `asaas_webhook_events` o evento `CHECKOUT_PAID` cujo `payload->checkout->>externalReference = 'remat:'||id_aluno` e gravar a soma dos itens em `valor_pago` (e o `checkout.id` em `asaas_checkout_id` quando ausente). Somente `UPDATE`, sem mudança de schema.
- `src/pages/Rematricula2027Admin.tsx`: no bloco de Pagamento da listagem e no diálogo de revisão, exibir "Valor não informado" quando `valor_pago` for nulo, mantendo forma e data.
