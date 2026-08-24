# Melhorar a visualização de "Dados alterados" (Rematrícula 2027)

Hoje o histórico aparece como uma lista corrida de linhas minúsculas, tudo colado, misturando o que foi corrigido com o que foi apenas preenchido. Fica ilegível quando há 16 itens.

## Como passa a ser

O painel expansível de alterações vira um bloco organizado em cartões:

- **Agrupado por pessoa**: Aluno, Pai, Mãe, Curso/Turno e Valores — cada grupo com título e contador.
- **Um cartão por campo**, em grade responsiva (1 coluna no celular, 2–3 no desktop), com respiro entre eles:
  - nome do campo em destaque
  - valor anterior riscado e discreto (só quando existia)
  - valor novo em destaque, com quebra de linha para e-mails/endereços longos
  - data da alteração
- **Etiqueta por tipo**: "Preenchido" (campo estava vazio, em verde) x "Corrigido" (tinha valor e mudou, em âmbar).
- **Filtro no topo do bloco**: "Todos" / "Somente corrigidos" / "Somente preenchidos", já que a secretaria normalmente só quer ver o que foi corrigido.
- Tipografia maior (text-sm no lugar de text-xs) e fundo suave para separar do resto da linha.

O mesmo componente é usado no diálogo de conferência ("Alterações de dados"), então os dois lugares melhoram juntos.

## Detalhes técnicos

- `src/pages/Rematricula2027Admin.tsx`: reescrever o componente `ListaAlteracoes` (linhas 187-203) — sem mudar dados nem RPCs.
  - Novo helper de grupo derivado do sufixo do campo (`_pai`, `_mae`, `cpf_aluno`, `curso_2027`/`turno_escolhido`, `percentual_*`/`valor_*`).
  - Estado local de filtro dentro do componente.
  - Tipo `Alteracao` e `LABEL_CAMPO` permanecem como estão.
- Nenhuma alteração no banco, nas edge functions ou em outras rotas.
