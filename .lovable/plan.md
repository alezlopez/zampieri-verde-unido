# Série pretendida vinculada à data de nascimento (/prematricula)

Na etapa "Dados do Aluno", a lista de séries passa a respeitar a idade do aluno, usando o corte de **31/03/2027**.

## Regra

Idade completada até 31/03/2027 define a série máxima:

```text
5 anos  -> Infantil 5 (Pré-Escola)
6 anos  -> 1º ano
7 anos  -> 2º ano
...
14 anos -> 9º ano
15 anos -> 1ª série EM
16 anos -> 2ª série EM
17 anos -> 3ª série EM
```

- O aluno pode escolher a série correspondente à sua idade **ou qualquer série anterior** (defasagem/repetência).
- Séries acima da idade ficam **desabilitadas** no dropdown, com o motivo visível.
- Idade abaixo de 5 anos: nenhuma série disponível, com aviso.
- **18 anos ou mais** em 31/03/2027: nenhuma série disponível, com aviso orientando contato com a secretaria.

## Comportamento na tela

- Enquanto a data de nascimento não for válida, o campo de série fica desabilitado com a mensagem "Informe a data de nascimento".
- Ao preencher a data, aparece uma linha informativa: idade em 31/03/2027 e a série máxima permitida.
- Se a data mudar e a série já escolhida deixar de ser válida, a seleção é limpa automaticamente.
- Ao tentar avançar com série incompatível, erro no campo: "Série incompatível com a data de nascimento".

## Detalhes técnicos

- `src/components/prematricula/types.ts`: adicionar a idade mínima de cada série (índice da lista `SERIES` + 5) e helpers `idadeEm31Marco(nascIso, ano)` e `seriesPermitidas(nascIso)`.
- `src/components/prematricula/Etapas.tsx` (`EtapaAluno`): renderizar itens do `Select` com `disabled` para séries não permitidas, exibir a nota de idade e limpar a seleção inválida quando a data mudar.
- `src/pages/PreMatricula.tsx`: na validação da etapa 1, rejeitar série fora da lista permitida e rejeitar maiores de 18.
- Validação equivalente no servidor (`supabase/functions/prematricula-enviar/index.ts`): recusar envio com série incompatível com `aluno_nascimento` (`erro: serie_incompativel`), evitando burlar pelo cliente.
- Ano de referência (2027) fica como constante única, fácil de atualizar em anos futuros.
