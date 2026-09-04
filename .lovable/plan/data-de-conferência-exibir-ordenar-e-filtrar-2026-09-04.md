# Data de conferência: exibir, ordenar e filtrar

No painel de Rematrícula 2027, a coluna "Conferência" hoje mostra apenas a data curta (dia/mês/ano) de quando foi conferida, sem hora, e não há como ordenar nem filtrar por esse período.

## O que muda

### 1. Mostrar a data completa
- A linha conferida passa a exibir data e hora (ex.: "04/09/2026 às 14:32").
- Passar o mouse mostra a data por extenso.

### 2. Ordenar pela data de conferência
- O cabeçalho "Conferência" vira um botão de ordenação: mais recentes primeiro, mais antigas primeiro, ou ordem padrão (como está hoje).
- Registros ainda não conferidos ficam sempre no fim da lista quando a ordenação por data está ativa.

### 3. Filtrar por período
- Ao escolher o filtro "Conferidas", aparecem dois campos de data ("de" e "até") para limitar às conferências feitas naquele intervalo.
- Atalhos rápidos: Hoje, Últimos 7 dias, Últimos 30 dias e Limpar.
- O contador do topo e a lista respeitam o período escolhido.

## Detalhes técnicos

Somente `src/pages/Rematricula2027Admin.tsx` (frontend). O campo `conferida_em` já vem da RPC `rematricula_2027_admin_listagem` e já está na interface `LinhaAdmin` — nenhuma migration ou mudança de RPC é necessária.

- Novos estados: `ordem` (`"padrao" | "conf_desc" | "conf_asc"`), `confDe`, `confAte` (strings ISO de `<input type="date">`).
- No `useMemo` `filtradas`: aplicar o intervalo quando `filtro === "conferidas"` (comparando `conferida_em` com início do dia "de" e fim do dia "até"), e depois ordenar por `conferida_em` conforme `ordem`, com nulos por último.
- Formatação com `toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })`.
- Nenhuma alteração no fluxo público de rematrícula, na RPC de conferir, nem em outras colunas.
