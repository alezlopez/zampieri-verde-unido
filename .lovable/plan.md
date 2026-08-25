# Desconto de 5% a 60% (passo 1%) na edição admin da Rematrícula 2027

Ajuste restrito ao diálogo "Editar valores" do painel de Rematrícula 2027. Nenhuma outra rota (pré-matrícula, matrícula, eventos) muda.

## O que muda

- O seletor de percentual de desconto passa a oferecer 5%, 6%, 7% ... até 60% (passo de 1%), no lugar da faixa atual de 10% a 50%.
- Se o aluno já estiver com um percentual fora dessa faixa, ele continua aparecendo como opção selecionada, para não alterar silenciosamente o desconto já cadastrado.
- Cálculo automático da mensalidade com desconto e textos por extenso continuam iguais.

## Detalhes técnicos

- `src/pages/Rematricula2027Admin.tsx`: em `opcoesPercentual`, trocar `Array.from({ length: 41 }, (_, i) => i + 10)` por `Array.from({ length: 56 }, (_, i) => i + 5)` (5 a 60), mantendo a inclusão do percentual atual quando fora da faixa.
- Migration: atualizar `public.rematricula_2027_admin_editar_valores` para validar `p_percentual_desconto` como inteiro entre 5 e 60, mantendo a permissão do percentual já gravado do aluno quando fora da faixa; mensagem de erro atualizada.
- Nenhuma mudança em `MatriculaAdmin.tsx`, `PreMatriculaAdmin.tsx` ou nas edge functions.
