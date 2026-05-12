## Objetivo

Substituir totalmente o webhook n8n por integração Asaas nativa em Edge Functions **e** abrir os eventos para compradores externos (não-alunos), sem quebrar nada do fluxo atual de alunos. Comprador externo pode se cadastrar pelo próprio fluxo de login com CPF; eventos passam a ter um campo de público-alvo que controla quem pode comprar.

## Visão geral

```text
┌── Login /eventos/login (CPF + senha) ──────────────────────────────┐
│  CPF encontrado em alunos_26 → fluxo aluno (já existe)            │
│  CPF NÃO encontrado          → oferecer "Criar conta como          │
│                                 comprador externo" no mesmo card  │
└────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌── /eventos (lista) ────────────────────────────────────────────────┐
│  Filtra eventos pelo publico_alvo + tipo do usuário               │
└────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌── /eventos/comprar/:id ────────────────────────────────────────────┐
│  Aluno: dados vindos de alunos_26 (como hoje)                     │
│  Externo: dados vindos de compradores_externos                    │
│  INSERT ingressos (status=pendente)                                │
│  → invoke("asaas-create-checkout")                                 │
└────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
            Asaas (PIX / Cartão à vista e parcelado)
                       │  webhook
                       ▼
┌── Edge Function asaas-webhook (público, token validado) ───────────┐
│  Idempotente, atualiza status dos ingressos                       │
└────────────────────────────────────────────────────────────────────┘
```

## 1. Banco de dados (migration única)

### Nova tabela `compradores_externos`
- `id uuid pk`, `user_id uuid` (FK lógica para auth.users, único), `cpf text unique not null`, `nome text not null`, `email text not null`, `celular text`, `data_nascimento date`, `created_at`, `updated_at`.
- RLS: usuário lê/atualiza somente o próprio registro; admins leem tudo. Insert: usuário só insere com `auth.uid() = user_id`.

### `eventos` — novos campos (defaults seguros)
- `publico_alvo text default 'alunos_e_convidados'` com check em (`apenas_alunos`, `alunos_e_convidados`, `aberto_ao_publico`).
- Manter `tipo_evento`/`is_excursao` como estão (sem mexer).
- Backfill: todos eventos atuais ficam com `alunos_e_convidados` → comportamento idêntico ao de hoje.

### `ingressos` — novos campos
- `asaas_customer_id text`
- `asaas_payment_id text` + índice
- `forma_pagamento text` (`pix` | `credit_card`)
- `parcelas integer default 1`
- `valor_total numeric`
- `tipo_comprador text default 'aluno'` (`aluno` | `externo`) — não confundir com `tipo_participante`.

### Nova tabela `asaas_webhook_events` (auditoria + idempotência)
- `event_id text unique`, `event_type text`, `payment_id text`, `payload jsonb`, `processed boolean`, `error text`, `created_at`.
- RLS: somente admins leem; escrita só via service role na Edge Function.

### Novas RPCs (SECURITY DEFINER)
- `find_user_context_by_cpf(p_cpf)` → retorna `{ origem: 'aluno' | 'externo' | 'nenhum', email, nome }`. Usada pelo login para decidir o caminho.
- `get_comprador_dados(p_user_id)` → retorna nome/cpf/email/celular/origem para a Edge Function montar o customer no Asaas, sem expor tabelas diretamente.

## 2. Edge Functions (Supabase)

Todas com Zod, CORS, logs estruturados, e secrets `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN`.

1. **`asaas-create-checkout`** (autenticada via `getClaims`)
   - Input: `{ ingresso_ids, forma_pagamento, parcelas? }`.
   - Confere ownership de todos os ingressos.
   - Resolve dados do comprador via `get_comprador_dados` (aluno OU externo).
   - Busca/cria customer no Asaas pelo CPF (`GET /customers?cpfCnpj=`, senão `POST /customers`).
   - PIX: cria `payment` único (soma dos preços) e devolve QR + `invoiceUrl`.
   - Cartão: cria `paymentLink` com `maxInstallmentCount = parcelas` (limitado por `evento.max_parcelas`).
   - Persiste `asaas_payment_id`, `asaas_customer_id`, `checkout_url`, `checkout_id`, `forma_pagamento`, `parcelas`, `valor_total`, `tipo_comprador` em todos os ingressos da compra.
   - **Idempotente**: se os ingressos já têm `asaas_payment_id`, devolve o checkout existente.

2. **`asaas-webhook`** (público, `verify_jwt=false`)
   - Valida header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`.
   - Insere em `asaas_webhook_events` com `ON CONFLICT (event_id) DO NOTHING` → idempotência.
   - Mapeia evento → status:
     - `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `pago`
     - `PAYMENT_OVERDUE` → `pendente`
     - `PAYMENT_REFUNDED` / `PAYMENT_DELETED` → `estornado`
     - `PAYMENT_CHARGEBACK_REQUESTED` → `cancelado`
   - `UPDATE ingressos WHERE asaas_payment_id = …` (atinge todos os ingressos da mesma cobrança).
   - Sempre responde 200; erros vão para `asaas_webhook_events.error` e logs.

3. **`asaas-sync-payment`** (admin) — reconciliação
   - Input `{ payment_id }` ou `{ ingresso_id }`. Consulta `GET /payments/{id}` e força update. Cobre webhooks perdidos.

4. **`comprador-externo-signup`** (autenticada)
   - Input: `{ cpf, nome, email, celular, data_nascimento, password }`.
   - Cria usuário no `auth.users` (admin API com service role) já confirmado, insere em `compradores_externos`. Retorna `{ ok: true }`. O frontend faz signIn em seguida.
   - Garante CPF único e impede duplicar quando o CPF já existe em `alunos_26` (orienta a logar como aluno).

## 3. Frontend

### `EventosLogin.tsx`
- Mantém o login por CPF.
- Após digitar o CPF, se `find_user_context_by_cpf` devolver `nenhum`, mostrar bloco "Não é aluno? Crie sua conta de comprador" com formulário (nome, email, celular, data nascimento, senha) → chama `comprador-externo-signup` → faz login automático.
- Reset de senha continua igual (já cobre auth.users em geral).

### `Eventos.tsx` (vitrine)
- Filtra cards por `publico_alvo`:
  - usuário não logado → mostra todos com badge "Para quem pode comprar".
  - logado aluno → todos os eventos.
  - logado externo → só `aberto_ao_publico`.
- Botão "Comprar" desabilitado com tooltip explicativo quando o público não permite.

### `EventoCompra.tsx`
- Mantém UX e validações atuais.
- Ramo aluno: igual a hoje.
- Ramo externo (detectado por `tipo_comprador` resolvido no client via RPC): pula seleção de filhos/aluno, vai direto para "comprador + participantes" (todos como `convidado` por padrão; se `is_excursao`, exigir CPF/data_nascimento dos participantes como hoje).
- **Remove o fetch para n8n** e a serialização base64 da imagem.
- Após `INSERT` dos ingressos, chama `supabase.functions.invoke("asaas-create-checkout", { body: { ingresso_ids, forma_pagamento, parcelas } })`.
- Em sucesso: usa `checkout_url` retornado (mantém o countdown atual).
- Em erro: toast + botão "Tentar novamente" (chama de novo, idempotente).

### `EventosAdmin.tsx`
- Novo campo "Público-alvo" no formulário de criar/editar evento (select com 3 opções).
- Botão "Reconciliar pagamento" por ingresso pendente → chama `asaas-sync-payment`.
- Botão "Gerar checkout" para ingressos pendentes sem `checkout_url`.
- Lista mostra `tipo_comprador` (aluno/externo) por ingresso.

### `MeusIngressos.tsx`
- Sem mudança funcional (já consome `checkout_url` e status).

## 4. Configuração externa (passos manuais que vou listar para você)

- Painel Asaas → Webhooks:
  - URL: `https://lzdhrtcugqnqmyapgmbs.supabase.co/functions/v1/asaas-webhook`
  - Token de autenticação: mesmo valor do secret `ASAAS_WEBHOOK_TOKEN`.
  - Eventos: `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_DELETED`, `PAYMENT_CHARGEBACK_REQUESTED`.

## 5. Secrets necessários (vou pedir antes de codificar as functions)

- `ASAAS_API_KEY`
- `ASAAS_BASE_URL` (sandbox: `https://api-sandbox.asaas.com/v3` / prod: `https://api.asaas.com/v3`)
- `ASAAS_WEBHOOK_TOKEN` (qualquer string aleatória forte)

## 6. Por que é "robusto, sem falhas"

- **Idempotência dupla**: cobrança não duplica (checa `asaas_payment_id` existente) e webhook não reprocessa (`event_id UNIQUE`).
- **Auditoria total**: payload bruto fica em `asaas_webhook_events.payload`.
- **Reconciliação manual** disponível no admin para qualquer caso de webhook perdido.
- **Vagas**: trigger `atualizar_vagas_disponiveis` já trata transições — sem mexer.
- **Compatibilidade**: defaults dos novos campos preservam comportamento atual; eventos antigos continuam funcionando.
- **Segurança**: RLS estrita em `compradores_externos` e `asaas_webhook_events`; webhook valida token; service role só dentro de Edge Functions.

## 7. Fora de escopo

- Notificações por e-mail/WhatsApp pós-pagamento (próxima etapa, se quiser).
- Migrar eventos existentes para outro `publico_alvo` (você muda manualmente quando quiser).
- Apagar workflow no n8n (fica desconectado, você decide quando remover).

## 8. Ordem de execução

1. Migration: `compradores_externos`, novos campos em `eventos`/`ingressos`, `asaas_webhook_events`, RPCs novas, índices, RLS.
2. Pedir os 3 secrets do Asaas.
3. Criar Edge Functions: `asaas-create-checkout`, `asaas-webhook`, `asaas-sync-payment`, `comprador-externo-signup`.
4. Atualizar `EventosLogin.tsx` (auto-cadastro).
5. Atualizar `Eventos.tsx` (filtro por público).
6. Atualizar `EventoCompra.tsx` (resolver origem + invoke da Edge Function, remover n8n).
7. Atualizar `EventosAdmin.tsx` (campo público-alvo + botões de reconciliação).
8. Você configura webhook no painel Asaas (vou te enviar URL e token).
9. Teste end-to-end em sandbox: aluno PIX, aluno cartão parcelado, externo PIX, externo cartão.
