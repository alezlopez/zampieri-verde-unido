# Matrícula gratuita (isenta de cobrança)

Nova opção no painel do admin, dentro do bloco de informações financeiras: **"Matrícula gratuita (sem cobrança)"**. Quando marcada, a família não vê etapa de pagamento — assim que o contrato for assinado, a matrícula é concluída automaticamente.

## Como fica no admin

- Um switch "Matrícula gratuita (isenta de cobrança)" junto de "permite à vista / parcelado".
- Ao marcar: o campo "Valor da matrícula" fica desabilitado e é gravado como zero; as opções de forma de pagamento e máximo de parcelas somem.
- A validação de "valores prontos" (necessária para liberar o contrato) passa a aceitar valor da matrícula zerado quando a matrícula é gratuita — os demais campos (anuidade, mensalidade com desconto, dia de vencimento) continuam obrigatórios.
- Na lista, a matrícula gratuita ganha uma etiqueta "Isenta" para diferenciar de uma cobrança pendente.

## Como fica para a família

- O bloco de pagamento é substituído por um aviso: "Matrícula isenta de taxa — nada a pagar."
- Assim que a assinatura é confirmada (tanto pelo botão "Já assinei — verificar agora" quanto pelo aviso automático da ZapSign), a matrícula passa direto para **concluída**, com valor pago zero e data de pagamento no momento da assinatura.
- O e-mail/mensagem de conclusão de matrícula é disparado nesse momento, igual ao fluxo pago.
- Se alguém tentar abrir o checkout de uma matrícula gratuita, a solicitação é recusada.

## Detalhes técnicos

**Banco (migration):**
- `matriculas`: nova coluna `matricula_gratuita boolean not null default false`.

**Edge functions:**
- `_shared/matricula-contrato.ts`: `valoresProntos` aceita `valor_matricula` nulo/zero quando `matricula_gratuita = true`. Novo helper `concluirMatriculaGratuita(admin, mat, pm)` que grava `status = 'concluida'`, `concluida_em`, `valor_pago = 0`, `data_pagamento`, `forma_pagamento = 'isento'` e dispara `notificar("matricula_concluida", ...)` uma única vez (guardado por `concluida_em`/`email_conclusao_enviado_em`).
- `matricula-admin`: `matricula_gratuita` entra em `CAMPOS_EDITAVEIS` como booleano; quando true, `valor_matricula` é normalizado para 0.
- `matricula-portal`: `estado` devolve `matricula_gratuita`; a ação `checkout` retorna erro `matricula_isenta` quando gratuita; `verificar_assinatura` chama `concluirMatriculaGratuita` quando a assinatura é confirmada e a matrícula é gratuita.
- `zapsign-webhook`: no ramo de matrícula, após marcar `contrato_assinado`, chama o mesmo helper quando `matricula_gratuita = true`.

**Frontend:**
- `src/pages/MatriculaAdmin.tsx`: switch novo, desabilita/zera "Valor da matrícula", esconde formas de pagamento, ajusta `valoresProntos` local e adiciona a etiqueta "Isenta".
- `src/pages/Matricula.tsx`: quando `matricula.matricula_gratuita`, o bloco de pagamento vira o aviso de isenção (e o estado concluído mostra a confirmação normal de matrícula finalizada).
- `src/components/matricula/RoadmapEtapas.tsx`: a etapa de pagamento é rotulada como "Conclusão" nesse caso.
