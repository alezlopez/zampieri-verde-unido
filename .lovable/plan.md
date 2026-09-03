# Isenção marcada depois da assinatura não conclui a rematrícula

## O que aconteceu (verificado no banco)

Bernardo Mendes (2637) e Eduardo Mendes (2638) estão com contrato assinado, isenção ativa e `rematricula_concluida = false`.

O histórico mostra a causa: a isenção foi marcada em 02/09 às 16:10 — **depois** que o contrato já havia sido assinado (dados preenchidos em 01/09). Hoje a conclusão automática do isento só roda no momento em que a assinatura é detectada (webhook da ZapSign e verificação de assinatura). Como nessa ordem a assinatura já tinha acontecido, nada disparou a conclusão.

## Correção

1. **Marcar isenção passa a concluir na hora**: ao ativar a isenção pelo painel, se o contrato já estiver assinado e a rematrícula não estiver concluída/cancelada, o sistema conclui imediatamente — mesma rotina já usada hoje (marca concluída, valor pago zero, e-mail de conclusão e mensagem de WhatsApp de rematrícula concluída).
2. **Regularizar os dois alunos**: rodar essa mesma conclusão para 2637 e 2638, gerando e-mail/WhatsApp de conclusão e números da sorte, se aplicável.

Nada muda para quem paga normalmente: fluxo de checkout, contrato e cancelamento continuam iguais.

## Detalhes técnicos

- Nova edge function `rematricula-2027-isentar` (service role, autenticada e restrita ao setor `rematricula`): chama a RPC `rematricula_2027_admin_isentar` e, quando `p_isento = true`, invoca `concluirRematriculaIsenta` de `_shared/rematricula-isencao.ts` (já idempotente: só age com `isentar_valor_rematricula`, `contrato_assinado` e sem `rematricula_concluida`).
- `src/pages/Rematricula2027Admin.tsx`: `alternarIsencao` passa a chamar essa function em vez da RPC direta, mantendo os mesmos toasts e o `carregar()`.
- Regularização dos casos existentes: invocar a function/rotina para `id_aluno` 2637 e 2638 e conferir no banco `rematricula_concluida = true`, `forma_pagamento = 'isento'`, `valor_pago = 0`.
