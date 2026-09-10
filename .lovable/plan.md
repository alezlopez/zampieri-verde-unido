# Cobrança sempre no valor da fase atual

## Problema

Quando alguém assina o contrato numa fase e só vai pagar depois que a fase terminou, o pagamento que já estava gerado continua valendo por 24h — com o preço antigo. Foi o caso do Kauan: gerou e assinou em 09/09 (fase 1) e, ao pagar em 10/09 (fase 2), o PIX/checkout antigo ainda mostrava o valor da fase 1.

O cálculo do valor em si já usa a fase vigente. A brecha está só no reaproveitamento da cobrança criada antes da virada de fase.

## O que muda

1. Qualquer cobrança (PIX ou cartão) criada **antes do início da fase atual** deixa de ser reaproveitada, mesmo dentro das 24h.
2. A cobrança antiga pendente é cancelada no Asaas, para que ninguém consiga pagar o valor vencido por um link salvo.
3. Ao entrar na tela de pagamento nessa situação, o responsável vê o valor atualizado da fase atual e gera uma nova cobrança normalmente, com um aviso curto explicando que a fase anterior encerrou e o valor foi atualizado.
4. Números da sorte continuam pela fase da data do pagamento (é o comportamento atual e está correto): quem paga na fase 2 recebe a quantidade da fase 2; após 28/10 não gera números.

## Detalhes técnicos

- Ampliar `rematricula_2027_valor_vigente` para também devolver `fase_inicio` (data de início da fase vigente, horário de Brasília).
- Em `supabase/functions/rematricula-2027-checkout/index.ts`:
  - buscar a fase vigente antes dos blocos de reaproveitamento;
  - considerar a cobrança válida apenas se `checkout_criado_em` estiver dentro das 24h **e** for igual/posterior a `fase_inicio`;
  - quando invalidada por virada de fase: cancelar o pagamento pendente no Asaas (`DELETE /payments/{id}` para PIX; cancelar checkout quando aplicável), limpar `asaas_payment_id`, `asaas_checkout_id`, `checkout_url` e `checkout_criado_em`, e responder `{ existente: false, fase_virou: true }` na consulta;
  - adicionar helper de cancelamento em `_shared/asaas.ts` se ainda não existir.
- Em `StepPagamento.tsx`: quando a resposta trouxer `fase_virou`, exibir aviso de que o valor foi atualizado para a fase atual e liberar a geração de nova cobrança (sem alterar o restante do fluxo).
- Não altera contrato, assinatura, isenção, follow-up nem a lógica de geração de números da sorte.

## Verificação

- Conferir quais alunos têm cobrança pendente criada antes de 10/09 e cancelá-las no Asaas para evitar pagamento em valor vencido (lista apresentada antes de executar).
