# Desconto de 1 em 1% (10% a 50%) na edição admin da Rematrícula 2027

Alterar apenas o diálogo "Editar valores" do painel de Rematrícula 2027. Nenhuma outra rota (pré-matrícula, matrícula, eventos) muda.

## O que muda

- O seletor de percentual de desconto passa a oferecer 10%, 11%, 12% ... até 50% (passo de 1%), no lugar da lista atual de 0% a 60% de 5 em 5.
- Se o aluno já estiver com um percentual fora dessa faixa (por exemplo 0% ou 60%), esse valor continua aparecendo como opção selecionada, para não alterar silenciosamente o desconto de quem já está cadastrado.
- O cálculo automático da mensalidade com desconto e os textos por extenso continuam funcionando igual, agora aceitando qualquer inteiro na faixa.

## Detalhes técnicos

- `src/pages/Rematricula2027Admin.tsx`: substituir a geração de opções `Array.from({ length: 13 }, (_, i) => i * 5)` por uma lista de 10 a 50 passo 1, acrescentando o valor atual do aluno caso não esteja na lista.
- Migration: atualizar `public.rematricula_2027_admin_editar_valores` para validar `p_percentual_desconto` entre 10 e 50 com incremento de 1 (inteiro), removendo a regra `% 5`, e permitindo também o percentual já gravado do aluno quando fora da faixa. Mensagem de erro atualizada.
- Nenhuma mudança em `MatriculaAdmin.tsx`, `PreMatriculaAdmin.tsx` ou nas edge functions de matrícula.
