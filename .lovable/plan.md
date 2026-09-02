# Controle de vagas no painel admin

## Objetivo
Hoje as vagas de 2027 só existem no banco (tabela `vagas_2027`, 22 linhas por curso/turno) e são consultadas pelo fluxo público da rematrícula. A ideia é ter uma tela no painel admin para visualizar a ocupação e editar os limites.

## Como fica a tela

Nova página `/admin/vagas`, com atalho no bloco "Rematrícula 2027" da home do admin (visível para admin e para quem tem o setor `rematricula`).

Tabela agrupada por curso, uma linha por turno:

```text
Curso                              Turno   Máx.  Ocupadas  Livres  Ativo
Educação Infantil - Pré            Tarde    28      12       16     [x]
Ensino Fundamental I - 1º Ano      Manhã    25      25        0     [x]
Ensino Fundamental I - 1º Ano      Tarde    50      31       19     [x]
```

- "Ocupadas" = alunos com aquele curso/turno escolhido em `alunos_rematricula_2027` (mesma contagem já usada no fluxo público).
- Linhas lotadas destacadas em vermelho, quase lotadas (>=90%) em âmbar.
- Cabeçalho com totais: total de vagas, ocupadas e livres.
- Edição inline do campo "Máx." (número) e do interruptor "Ativo", com botão Salvar por linha.
- Botão "Adicionar turma" para criar uma combinação curso + turno que ainda não existe, e opção de remover uma linha sem ocupação.
- Filtro por curso e alternância "mostrar apenas turmas lotadas".

## Detalhes técnicos

**Banco (migration)**
- Nova RPC `rematricula_2027_admin_vagas()` (SECURITY DEFINER, STABLE): retorna todas as linhas de `vagas_2027` (inclusive inativas) com `id, curso_2027, turno, max_vagas, ativo, ocupadas, disponiveis`, usando a mesma regra de contagem de `rematricula_2027_turnos`. Acesso restrito a quem passa em `has_setor(auth.uid(),'rematricula')`.
- As gravações (insert/update/delete) usam a política `vagas_2027_admin_gerencia`, que já existe e exige o setor `rematricula` — nenhuma mudança de RLS necessária.

**Frontend**
- Nova página `src/pages/AdminVagas.tsx` seguindo o padrão visual das telas admin existentes.
- Rota em `App.tsx` protegida por `RequireAdmin` com `setor="rematricula"`.
- Novo atalho "Controle de vagas" no bloco Rematrícula 2027 em `AdminHome.tsx`.

## Fora do escopo
- A tabela antiga `vagas_turmas` (ciclo 2026) não entra nesta tela.
- Nenhuma mudança no fluxo público de rematrícula, checkout ou contratos.
