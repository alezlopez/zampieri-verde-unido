# Controle de acompanhamento nas pré-matrículas e matrículas

Trazer para as listas de pré-matrícula e matrícula o mesmo tipo de controle que já existe na rematrícula: um marcador "Conferido" e a possibilidade de marcar um caso como desistente ou cancelado.

## 1. Marcador "Conferido" (matrículas)

- Aparece apenas nas matrículas com status "Matrícula concluída".
- Na lista, o caso concluído mostra um botão "Marcar como conferida"; depois de marcado, vira uma etiqueta verde "Conferida" com data, hora e quem conferiu.
- Dá para desfazer a conferência.
- Contadores no topo: Concluídas, A conferir, Conferidas.
- Filtros novos: "A conferir" e "Conferidas", com filtro de período (Hoje, Últimos 7 dias, Últimos 30 dias, Limpar) sobre a data de conferência — igual à tela de rematrícula.

## 2. Desistente e Cancelado (pré-matrículas e matrículas)

- Dentro do detalhe de cada caso, dois botões: "Marcar como desistente" e "Cancelar".
- Ambos pedem um motivo curto (obrigatório) e confirmação.
- Ao marcar, o caso sai da lista de "em andamento".
- Filtros novos nas duas telas: "Desistentes" e "Cancelados". Ao abrir, mostram motivo, data e quem registrou, com a opção "Reabrir" que devolve o caso ao andamento anterior.
- Etiquetas: cinza para desistente, vermelha para cancelado.
- Cancelar/desistir não mexe em contrato assinado nem em pagamento já feito; é apenas um marcador de acompanhamento. Se o caso já tiver contrato assinado ou pagamento, o aviso deixa isso explícito antes de confirmar.

## 3. Contadores no topo das duas listas

Uma faixa de números para leitura rápida: em andamento, concluídas, a conferir, conferidas, desistentes, cancelados.

## Detalhes técnicos

Migration:
- `public.matriculas`: `conferida boolean not null default false`, `conferida_em timestamptz`, `conferida_por uuid`.
- `public.matriculas` e `public.prematriculas`: `acompanhamento text not null default 'ativo'` (valores `ativo` | `desistente` | `cancelado`), `acompanhamento_motivo text`, `acompanhamento_em timestamptz`, `acompanhamento_por uuid`. Validação por trigger (não CHECK) para os valores permitidos.

Edge Functions (mantendo a checagem `has_setor(user, 'matricula')` já existente):
- `matricula-admin`: novas ações `conferir` (exige `status = 'concluida'`), `desconferir` e `acompanhamento` (payload `{ estado, motivo }`), gravando `auth.uid()` do chamador.
- `prematricula-admin-acao`: nova ação `acompanhamento` com o mesmo contrato; `reabrir` volta para `ativo`.
- As ações de listagem passam a devolver os novos campos.

Frontend:
- `src/pages/MatriculaAdmin.tsx`: bloco de contadores, filtros (`todos`, status existentes, `a_conferir`, `conferidas`, `desistentes`, `cancelados`), filtro de período por `conferida_em`, ordenação por data de conferência, botão de conferência no card e ações de desistência/cancelamento no diálogo. Reaproveitar o padrão visual de `Rematricula2027Admin.tsx`.
- `src/pages/PreMatriculaAdmin.tsx`: mesmos filtros de acompanhamento e ações no diálogo; a lista padrão passa a excluir `acompanhamento <> 'ativo'` além do já excluído `entrevista_concluida`.
- Regenerar `types.ts` após a migration.
