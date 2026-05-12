## Inclusão manual de ingressos no painel admin

Adicionar um botão "Adicionar ingresso manual" para cada evento no `EventosAdmin`, abrindo um formulário que permite ao admin lançar ingressos já pagos (cortesia, pagamento externo, dinheiro, etc.) com os dados completos dos participantes.

### Fluxo de uso

1. Admin clica em "Ingressos" no card do evento (já existente).
2. Acima da lista aparece o botão "+ Adicionar ingresso manual".
3. Abre um formulário inline com:
   - Dados do comprador: nome, CPF (usado para vincular usuário).
   - Lista dinâmica de participantes (botão "+ Adicionar participante"), cada um com: tipo (aluno/convidado), nome, CPF, data de nascimento, e-mail, celular. Para tipo aluno, campo "código do aluno".
   - Observação opcional.
4. Ao salvar:
   - Valida vagas disponíveis no evento (busca `vagas_disponiveis` atualizado).
   - Tenta resolver `user_id` via CPF do comprador (RPC nova `find_user_id_by_cpf`); se não achar, usa `auth.uid()` do admin.
   - Insere 1 registro por participante em `ingressos` com `status = 'pago'` (trigger `atualizar_vagas_disponiveis` desconta vagas automaticamente).
   - Marca `nome_comprador`, `cpf_participante`, `tipo_participante`, etc.
5. Lista de ingressos é recarregada e mostra os novos registros como "pago".

### Mudanças

**1. Migração (Supabase)** — nova RPC `find_user_id_by_cpf(p_cpf text)`:
- `SECURITY DEFINER`, `search_path = public`.
- Procura em `alunos_26.cpf_pai`/`cpf_mae`, pega `email` correspondente, e busca `auth.users` por esse e-mail. Retorna `user_id uuid` ou `NULL`.

**2. `src/pages/EventosAdmin.tsx`**:
- Novo estado: `showManualForm`, `manualEventoId`, `compradorNome`, `compradorCpf`, lista `participantes[]`.
- Função `handleAddParticipante`, `handleRemoveParticipante`, `handleSaveManual`.
- Botão "+ Adicionar ingresso manual" dentro do bloco `selectedEventoIngressos === evento.id`.
- Formulário inline (Card) com os campos descritos.
- `handleSaveManual`:
  - Valida nome do comprador e ao menos 1 participante com nome.
  - Chama `supabase.rpc("find_user_id_by_cpf", { p_cpf })` se CPF informado; fallback `user.id` do admin.
  - Recarrega `vagas_disponiveis` do evento; se < participantes, bloqueia.
  - Insert em massa em `ingressos` com `status: "pago"`, `tipo_participante`, dados do participante.
  - Toast de sucesso, fecha formulário, recarrega ingressos + eventos.

### Observações técnicas

- A RLS atual (`Users can create own tickets`) exige `auth.uid() = user_id`. Como o admin sempre está autenticado, vincular ao admin (fallback) ou ao próprio usuário do CPF ambos passam — quando vinculado a outro usuário, a policy bloqueia. **Solução**: o INSERT vai sempre com `user_id = auth.uid() (admin)`; em paralelo, gravamos o `user_id` real do responsável em uma coluna nova... 
  
  Mais simples: **manter `user_id = auth.uid() do admin`** sempre (ingresso é administrativo). Se a RPC encontrar um usuário pelo CPF, usamos esse `user_id` mas precisaremos relaxar a policy via política nova "Admins can create tickets for any user" (`has_role(auth.uid(), 'admin')`). Vou adicionar essa policy na migração para permitir que o ingresso apareça em "Meus Ingressos" do responsável real.

- O trigger `atualizar_vagas_disponiveis` cuida de descontar vagas automaticamente para `status` diferente de cancelado/estornado.

- Não altera webhooks, edge functions, fluxo público de compra ou Asaas.

### Arquivos afetados

- `supabase/migrations/*` (nova RPC + nova RLS policy de INSERT para admins).
- `src/pages/EventosAdmin.tsx` (UI + lógica).