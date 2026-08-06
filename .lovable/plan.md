# Conferência de rematrículas no painel admin

Objetivo: depois que a rematrícula é concluída (paga), permitir marcar cada aluno como "Conferida", ver rapidamente o que a família alterou nos dados, quem é o responsável financeiro e o percentual de desconto — tudo antes de confirmar a conferência.

## O que muda

### 1. Status "Conferida"
- Novo campo na ficha do aluno: conferida (padrão falso), com data e usuário que conferiu.
- No painel, cada linha concluída ganha um botão "Marcar como conferida" (e a opção de desfazer).
- Novo filtro: "Concluídas não conferidas" / "Conferidas", além do contador no topo.

### 2. Registro de alterações de dados
- Toda alteração feita pela família no fluxo público passa a ser gravada em um histórico (campo alterado, valor anterior, valor novo, data).
- Só entram campos de cadastro (aluno, pai, mãe, curso/turno, responsável financeiro) — campos de sistema (contrato, pagamento, números da sorte) ficam de fora.
- No painel, linha com alterações mostra o selo "Dados alterados (N)" e um painel expansível listando: campo, "de" → "para".
- Histórico só passa a existir a partir da implantação; alterações anteriores não são recuperáveis.

### 3. Responsável financeiro e desconto
- Coluna "Resp. financeiro" passa a mostrar Pai/Mãe com o nome e CPF do responsável.
- Nova coluna "Desconto" com o percentual da mensalidade e o valor da mensalidade com desconto.

### 4. Visualização antes de conferir
- Ao clicar em "Marcar como conferida", abre um painel de revisão com: aluno, curso/turno 2027, responsável financeiro (nome, CPF, contato), percentual de desconto e mensalidade, pagamento (forma/valor/data) e a lista de alterações de dados. Confirmação em dois passos.

## Detalhes técnicos

Migrations:
- `alunos_rematricula_2027`: `conferida boolean not null default false`, `conferida_em timestamptz`, `conferida_por uuid`.
- Nova tabela `rematricula_2027_alteracoes` (id, id_aluno, campo, valor_anterior, valor_novo, created_at) com GRANTs, RLS habilitado e leitura apenas para admin (`has_role`), escrita apenas via trigger/security definer.
- Trigger `AFTER UPDATE` em `alunos_rematricula_2027` que insere uma linha por coluna de cadastro alterada (lista explícita de colunas, ignorando as de sistema).
- RPC `rematricula_2027_admin_conferir(p_id_aluno, p_conferida)` — SECURITY DEFINER, exige `has_role(auth.uid(),'admin')`, grava `conferida`, `conferida_em`, `conferida_por`.
- Atualizar `rematricula_2027_admin_listagem` para retornar também: `conferida`, `conferida_em`, `percentual_desconto`, `valor_com_desconto`, `nome_pai`, `cpf_pai`, `celular_pai`, `nome_mae`, `cpf_mae`, `celular_mae`, `qtd_alteracoes` e as alterações agregadas em JSON.

Frontend (`src/pages/Rematricula2027Admin.tsx`):
- Ampliar a interface `LinhaAdmin` com os novos campos, adicionar colunas Desconto e Conferência, botão de ação chamando a nova RPC + recarregar, linha expansível com histórico, novos filtros e contador. Sem alteração no fluxo público de rematrícula.
