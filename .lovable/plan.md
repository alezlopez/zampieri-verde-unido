# Admin pode alterar desconto e mensalidade da rematrícula 2027

Hoje o painel de Rematrícula 2027 só permite corrigir CPFs e telefones dos responsáveis. O desconto e a mensalidade vêm da base e não podem ser ajustados pela secretaria.

## O que muda

No mesmo diálogo de edição da ficha do aluno, passa a existir um bloco "Valores da rematrícula" com:

- Percentual de desconto (0% a 60%, de 5 em 5)
- Mensalidade com desconto (R$)
- Percentual por extenso e mensalidade por extenso — campos de texto usados no contrato, no mesmo padrão do painel de Matrículas

Ao salvar, os novos valores passam a valer para o fluxo da família (telas de curso/pagamento) e para o contrato que ainda será gerado.

## Regras

- Só usuários com acesso ao setor de rematrícula podem alterar.
- Edição bloqueada quando o contrato já foi assinado ou a rematrícula já foi paga — nesse caso os campos aparecem apenas em leitura, com aviso de que o contrato precisa ser refeito pela secretaria.
- Quando o contrato foi apenas gerado (não assinado), salvar valores marca o contrato como não gerado e limpa o link, para que um novo contrato saia com os valores corretos.
- Toda alteração fica registrada no histórico de alterações do aluno, como já acontece com os demais campos.

## Detalhes técnicos

**Banco (migration)**
- Estender `rematricula_2027_admin_editar_contatos` (mantendo os parâmetros atuais como opcionais) com `p_percentual_desconto numeric`, `p_valor_com_desconto numeric`, `p_percentual_desconto_ext text`, `p_valor_com_desconto_ext text`.
- Validar: percentual entre 0 e 60 e múltiplo de 5; valor com desconto > 0 e ≤ `valor_cheio` quando houver.
- Recusar quando `contrato_assinado` ou `rematricula_concluida` forem verdadeiros.
- Quando `contrato_gerado` e não assinado: zerar `contrato_gerado`, `link_contrato` e `zapsign_token`.
- Inserir linhas em `rematricula_2027_alteracoes` para cada campo alterado (valor anterior/novo).

**Frontend — `src/pages/Rematricula2027Admin.tsx`**
- Adicionar os quatro campos ao estado `form` e ao `abrirEdicao` (pré-preenchidos com os valores atuais da linha).
- Percentual em `Select` (0–60, passo 5); mensalidade em input numérico; extensos em input de texto.
- Enviar os novos parâmetros em `salvarContatos` e recarregar a listagem após salvar.
- Renomear o título do diálogo para "Editar dados do aluno".
