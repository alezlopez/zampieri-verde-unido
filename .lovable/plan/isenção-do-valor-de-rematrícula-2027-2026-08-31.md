# Isenção do valor de rematrícula 2027

Alguns alunos poderão ser isentos da taxa de rematrícula. Para eles, o fluxo termina na assinatura do contrato: sem escolha de pagamento e sem checkout.

## Como fica no admin

- Na ficha do aluno (painel de Rematrícula 2027), um novo switch: **"Isentar valor da rematrícula"** (padrão: desligado para todos).
- Só pode ser alterado por usuários do setor rematrícula/admin, e apenas enquanto a rematrícula não estiver paga ou já concluída.
- A alteração fica registrada no histórico de alterações do aluno, como os demais campos.
- Na listagem, o aluno isento ganha a etiqueta **"Isento"** para não ser confundido com pagamento pendente.

## Como fica para a família

- Ao chegar na tela final, o bloco de pagamento é substituído por um aviso: "Rematrícula isenta de taxa — nada a pagar. Basta assinar o contrato."
- Assim que a assinatura é confirmada (pelo botão "Já assinei — verificar" ou pelo aviso automático da ZapSign), a rematrícula passa direto para **concluída**, com valor pago zero.
- A partir daí tudo segue igual ao fluxo pago: números da sorte são gerados, e-mail de conclusão e webhook de conclusão são disparados.
- Se alguém tentar abrir o checkout de um aluno isento, a solicitação é recusada.

## Detalhes técnicos

**Migration**
- `alunos_rematricula_2027`: nova coluna `isentar_valor_rematricula boolean not null default false`.
- `rematricula_2027_status` e `rematricula_2027_abrir`: passam a retornar `isentar_valor_rematricula`.
- `rematricula_2027_admin_listagem`: retorna a coluna para a etiqueta e o switch.
- Nova RPC `rematricula_2027_admin_isentar(p_id_aluno, p_isento boolean)` — SECURITY DEFINER, exige `has_role('admin')` ou `has_setor('rematricula')`, recusa quando `rematricula_concluida` ou `data_pagamento` já existem, grava a mudança e registra em `rematricula_2027_alteracoes`.

**Edge functions**
- `rematricula-2027-checkout`: retorna 409 `rematricula_isenta` quando o aluno é isento.
- Novo helper compartilhado `_shared/rematricula-isencao.ts` com `concluirRematriculaIsenta(admin, idAluno)`: quando o aluno é isento, contrato assinado e ainda não concluído, grava `rematricula_concluida = true`, `forma_pagamento = 'isento'`, `valor_pago = 0`, `data_pagamento = now()`, e dispara `rematricula-2027-email-conclusao` + o mesmo webhook de conclusão já usado hoje (guardado por `rematricula_concluida` para não repetir).
- `zapsign-verificar-assinatura` e `zapsign-webhook` (ramo de rematrícula): após marcar `contrato_assinado = true`, chamam o helper.
- O trigger existente `gerar_numeros_sorte_2027` já cria os números na virada de `rematricula_concluida`, sem alteração.

**Frontend**
- `src/components/rematricula/types.ts` e `StepPagamento.tsx` (`StatusRematricula`): novo campo `isentar_valor_rematricula`.
- `StepPagamento.tsx`: quando isento e contrato não assinado, mostra o aviso de isenção + botão "Já assinei — verificar"; quando concluído, a tela de sucesso atual (com números da sorte) permanece.
- `src/pages/Rematricula2027Admin.tsx`: switch de isenção no diálogo do aluno, chamada da nova RPC e etiqueta "Isento" na listagem.
