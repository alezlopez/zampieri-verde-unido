# Portal de transparência dos números da sorte

Página pública que lista todos os números da sorte já emitidos, com o nome do aluno parcialmente mascarado. Além disso, os números passam a ser enviados no webhook de conclusão da rematrícula.

## Página `/numerosdasorte/transparencia`

- Lista de todos os números emitidos, ordenada pelo número (0000 → 9999).
- Cada linha mostra o número e o nome do aluno abreviado (ex.: "Miguel N. do C."): primeiro nome completo, demais nomes reduzidos à inicial (preposições como "da", "de", "do", "dos" mantidas).
- Campo de busca simples no topo: digitar um número filtra a lista; digitar um nome filtra pelos nomes exibidos.
- Contador no topo com o total de números emitidos e o total de alunos participantes.
- Aviso curto de que a lista é atualizada automaticamente conforme os pagamentos são confirmados.
- Link para a página de consulta individual (`/numerosdasorte`) e link de volta nela para a transparência.
- Layout no mesmo estilo visual da página de consulta atual (verde/cream, sem elementos extras).

## Webhook de conclusão da rematrícula

No evento `rematricula_concluida` enviado para o n8n, incluir:
- `numeros_sorte`: array com os números do aluno;
- `numeros_sorte_texto`: os mesmos números separados por vírgula, pronto para uso como parâmetro de template;
- `total_numeros_sorte`: quantidade.

Os números continuam sendo gerados pela regra atual (gatilho na conclusão da rematrícula); o webhook apenas lê o que foi gerado.

## Detalhes técnicos

**Banco**
- Nova RPC `rematricula_2027_numeros_publicos()` SECURITY DEFINER, acessível a `anon`: retorna `numero` e o nome do aluno já mascarado no próprio SQL (a máscara é feita no servidor, o nome completo nunca sai do banco). Sem paginação inicialmente; ordena por `numero`.

**Frontend**
- Nova página `src/pages/NumerosDaSorteTransparencia.tsx` + rota em `src/App.tsx`.
- Filtro e contagem feitos no cliente sobre o resultado da RPC.
- Ajuste mínimo em `src/pages/NumerosDaSorte.tsx` apenas para adicionar o link para a transparência.

**Edge function**
- `supabase/functions/asaas-webhook/index.ts`: no bloco `remat:` após marcar `rematricula_concluida`, buscar os números em `rematricula_2027_numeros_sorte` (o gatilho já os gerou nesse ponto) e adicionar os três campos ao objeto `dados` do payload do webhook. Nenhuma outra alteração no fluxo de pagamento.
