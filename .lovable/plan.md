

## Plano: Tipo de Evento (Somente Alunos vs Alunos + Convidados) e Seleção de Participantes

### Resumo

Adicionar campo de tipo de evento no admin e reformular o formulário de compra para buscar automaticamente os alunos vinculados ao CPF do responsável, permitindo seleção múltipla e, quando aplicável, cadastro de convidados extras.

---

### 1. Migração no banco de dados

**Tabela `eventos`** — nova coluna:
```sql
ALTER TABLE public.eventos ADD COLUMN tipo_evento text NOT NULL DEFAULT 'alunos_convidados';
-- Valores: 'somente_alunos' ou 'alunos_convidados'
```

**Tabela `ingressos`** — novas colunas para dados do participante:
```sql
ALTER TABLE public.ingressos ADD COLUMN tipo_participante text NOT NULL DEFAULT 'aluno';
ALTER TABLE public.ingressos ADD COLUMN nome_participante text;
ALTER TABLE public.ingressos ADD COLUMN cpf_participante text;
ALTER TABLE public.ingressos ADD COLUMN data_nascimento_participante text;
ALTER TABLE public.ingressos ADD COLUMN email_participante text;
ALTER TABLE public.ingressos ADD COLUMN celular_participante text;
```

- `tipo_participante`: `'aluno'` ou `'convidado'`
- Para alunos, `codigo_aluno` e `nome_participante` (nome do aluno) serão preenchidos
- Para convidados, todos os campos extras serão preenchidos

---

### 2. Admin — Formulário de criação/edição (`EventosAdmin.tsx`)

- Adicionar estado `tipoEvento` (`'somente_alunos'` | `'alunos_convidados'`)
- Adicionar RadioGroup no formulário com as opções:
  - "Somente alunos"
  - "Alunos + Convidados"
- Incluir no payload do `handleSave` e no `handleEdit`
- Atualizar interface `Evento` com o novo campo

---

### 3. Fluxo de compra (`EventoCompra.tsx`) — Reformulação completa

**Busca automática de alunos:**
- Ao carregar, usar o CPF do `user.user_metadata.cpf` para buscar na tabela `alunos_26` todos os registros vinculados (pode haver múltiplos alunos por CPF)
- Exibir lista de alunos com checkboxes (nome_aluno, curso, codigo_aluno)
- O responsável seleciona para quais alunos quer comprar

**Convidados (quando `tipo_evento === 'alunos_convidados'`):**
- Botão "Adicionar convidado" que abre um mini-formulário inline com:
  - Nome completo, CPF, Data de nascimento, Email, Celular
- Permitir adicionar múltiplos convidados (lista dinâmica com botão de remover)

**Cálculo do total:**
- Total de participantes = alunos selecionados + convidados adicionados
- Preço total = participantes × preço (à vista ou parcelado, conforme seleção)

**Submissão:**
- Inserir um registro na tabela `ingressos` para cada participante:
  - Alunos: `tipo_participante='aluno'`, `codigo_aluno`, `nome_participante=nome_aluno`
  - Convidados: `tipo_participante='convidado'`, com todos os campos de dados pessoais
- `nome_comprador` = nome do responsável (pai/mãe) em todos os registros
- `user_id` = id do usuário logado

---

### 4. Atualizar tipos TypeScript

- Atualizar interface `Evento` em ambos os arquivos com `tipo_evento`
- O arquivo `types.ts` será atualizado automaticamente após a migração

---

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Nova migração SQL | `tipo_evento` em eventos, campos participante em ingressos |
| `EventosAdmin.tsx` | RadioGroup para tipo de evento, payload atualizado |
| `EventoCompra.tsx` | Busca de alunos por CPF, seleção múltipla, formulário de convidados |

