# Trocar a aluna 1082 do turno da tarde para a manhã

## O que foi verificado

- A aluna 1082 é **Helena Cerqueira Da Silva**, 8º Ano do Ensino Fundamental II, com contrato assinado e rematrícula concluída.
- No cadastro dela o **turno está em branco** (não ficou gravado nem manhã nem tarde), embora ela tenha feito a rematrícula para a tarde.
- Turmas do 8º Ano: manhã com 30 vagas (22 ocupadas hoje) e tarde com 55 vagas (14 ocupadas).
- Há vaga livre na manhã.

## O que será feito

- Gravar **manhã** como turno escolhido da aluna 1082.
- Nada mais muda: contrato, pagamento, números da sorte e valores permanecem como estão.

## Sobre as vagas

A ocupação das turmas é calculada automaticamente a partir do turno de cada aluno — não existe um contador manual. Assim que o turno da Helena for gravado como manhã, a tela de controle de vagas passa a mostrar 23 ocupadas na manhã e a tarde segue com 14 (ela não estava contada na tarde, pois o turno estava em branco).

## Detalhes técnicos

Atualização de dado em `alunos_rematricula_2027`:

```sql
UPDATE public.alunos_rematricula_2027
SET turno_escolhido = 'manhã', updated_at = now()
WHERE id_aluno = 1082;
```

Sem alterações de esquema, código ou regras de negócio.
