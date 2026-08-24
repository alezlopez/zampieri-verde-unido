# Ignorar mudanças que são só de formatação no histórico

No exemplo do CPF, "569559808-74" → "56955980874" aparece como "Corrigido", mas o número é o mesmo — mudou só a pontuação. O mesmo acontece com telefones, CEP, datas e textos com espaços/maiúsculas diferentes.

## Como passa a ser

- Antes de classificar, os dois valores são comparados de forma normalizada:
  - **CPF, RG, CEP, celular, telefone**: comparados só pelos dígitos.
  - **Datas de nascimento**: comparadas pela data real (14/10/1985 = 1985-10-14).
  - **Textos em geral**: comparados sem acento, sem espaços extras e sem diferença de maiúsculas.
- Se os valores forem equivalentes, o item **não aparece** na lista — não é uma alteração de verdade.
- O contador do bloco e das etiquetas ("Todos", "Corrigidos", "Preenchidos") passa a refletir só as alterações reais.
- Continua existindo a distinção: campo que estava vazio → "Preenchido"; campo que tinha outro conteúdo de fato → "Corrigido".
- O selo "Dados alterados (N)" da linha passa a usar essa mesma contagem real, para não prometer 16 e mostrar 6.

## Detalhes técnicos

- `src/pages/Rematricula2027Admin.tsx`, apenas frontend:
  - Novo helper `mesmoValor(campo, anterior, novo)` com normalização por tipo de campo (dígitos para documentos/contatos, parse de data para `data_nascimento_*`, normalização `NFD`/trim/lowercase para o resto).
  - `ListaAlteracoes` filtra `itens` por `!mesmoValor(...)` antes de agrupar e contar.
  - Um helper exportado no mesmo arquivo é usado para recalcular a contagem exibida no selo e no diálogo de conferência, no lugar de `qtd_alteracoes` cru.
- Nenhuma mudança em banco, RPCs ou triggers — os registros continuam gravados, apenas não são exibidos como alteração.
