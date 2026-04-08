

## Plano: Sistema de Eventos com Venda de Ingressos (/eventos)

### Resumo
Criar o módulo `/eventos` com autenticação por CPF + senha para responsáveis, painel admin para cadastro de eventos, e listagem pública de eventos com compra de ingressos (pagamento via webhook futuro).

---

### Estrutura de Banco de Dados (Migrações)

**1. Tabela `eventos`**
- `id` (uuid, PK)
- `titulo`, `descricao`, `data_evento`, `horario`, `local`
- `imagem_url` (opcional)
- `preco` (numeric)
- `vagas_total` (integer)
- `vagas_disponiveis` (integer)
- `ativo` (boolean, default true)
- `created_at`, `updated_at`
- RLS: leitura pública para eventos ativos; INSERT/UPDATE/DELETE apenas para admins

**2. Tabela `ingressos`**
- `id` (uuid, PK)
- `evento_id` (FK → eventos)
- `user_id` (uuid, FK → auth.users)
- `codigo_aluno` (text)
- `nome_comprador` (text)
- `quantidade` (integer)
- `status` (text: pendente, pago, cancelado)
- `webhook_payment_id` (text, nullable — para o webhook futuro)
- `created_at`
- RLS: usuário autenticado pode ver/inserir seus próprios ingressos

**3. Tabela `user_roles`** (conforme padrão de segurança)
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `role` (enum: admin, user)
- Função `has_role()` SECURITY DEFINER para verificação sem recursão

---

### Autenticação

**Responsáveis (login por CPF + senha):**
- Tela de cadastro: responsável informa CPF → sistema valida na tabela `alunos_26` (busca por `cpf_pai` ou `cpf_mae`) → se encontrado, permite criar conta com email do responsável + senha via Supabase Auth
- Tela de login: CPF + senha → busca email associado ao CPF → faz login via Supabase Auth com email + senha

**Admin:**
- Login via email + senha padrão do Supabase Auth
- Emails admin definidos fixos (ex: `secretaria@colegiozampieri.com.br`) → inseridos na tabela `user_roles` com role `admin`

---

### Páginas e Componentes

**1. `/eventos` — Listagem pública**
- Cards dos eventos ativos com imagem, título, data, preço, vagas
- Botão "Comprar Ingresso" (redireciona para login se não autenticado)
- Mesmo layout visual do site (header, footer, banner verde)

**2. `/eventos/login` — Login/Cadastro do responsável**
- Formulário CPF + senha
- Link para cadastro (se ainda não tem conta)
- Validação do CPF contra `alunos_26`

**3. `/eventos/comprar/:id` — Compra de ingresso (autenticado)**
- Detalhes do evento
- Selecionar quantidade
- Confirmar compra → cria registro em `ingressos` com status "pendente"
- Webhook de pagamento será adicionado depois

**4. `/eventos/admin` — Painel admin (protegido por role)**
- CRUD de eventos (criar, editar, ativar/desativar)
- Lista de ingressos vendidos por evento
- Acesso somente para usuários com role `admin`

**5. `/eventos/meus-ingressos` — Ingressos do usuário**
- Lista de ingressos comprados pelo responsável logado

---

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/migration` | Criar tabelas eventos, ingressos, user_roles, enum, função has_role |
| `src/pages/Eventos.tsx` | Listagem pública de eventos |
| `src/pages/EventosLogin.tsx` | Login/cadastro por CPF |
| `src/pages/EventoCompra.tsx` | Página de compra de ingresso |
| `src/pages/EventosAdmin.tsx` | Painel admin CRUD |
| `src/pages/MeusIngressos.tsx` | Ingressos do usuário |
| `src/contexts/AuthContext.tsx` | Contexto de autenticação com Supabase Auth |
| `src/hooks/useAuth.ts` | Hook de autenticação |
| `src/hooks/useAdmin.ts` | Hook para verificar role admin |
| `src/App.tsx` | Adicionar rotas /eventos/* |

---

### Segurança
- RLS em todas as tabelas novas
- Função `has_role()` SECURITY DEFINER para checar admin sem recursão
- Validação de CPF no servidor (edge function) para cadastro
- Roles nunca armazenadas no localStorage

