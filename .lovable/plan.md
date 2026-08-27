# Pré-matrícula: sair da lista quando a entrevista é concluída

Hoje o painel de Pré-matrículas lista todos os registros, inclusive os com status "Entrevista concluída" — que já aparecem em Matrículas em andamento. Isso duplica o aluno em duas seções.

## Mudança

- Na lista de Pré-matrículas, os registros com "Entrevista concluída" deixam de aparecer por padrão. O fluxo ativo mostra apenas: Pendente, Aprovado - aguardando agendamento, Entrevista agendada e Reprovado.
- O filtro de status ganha a opção "Entrevista concluída (já em matrícula)" — ao selecioná-la, esses registros aparecem, para consulta do histórico. A busca por nome/CPF/protocolo continua encontrando todos.
- Nenhuma mudança de dados, status ou no painel de Matrículas.

## Detalhes técnicos

`src/pages/PreMatriculaAdmin.tsx`, no `useMemo` `filtradas`: quando `filtro === "todos"`, excluir `status === "entrevista_concluida"` (salvo quando houver texto de busca). O item do filtro já é gerado a partir de `STATUS_LABEL`, então basta ajustar o rótulo exibido para deixar claro que aquele estágio já migrou para a matrícula.
