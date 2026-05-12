## Análise dos avisos de segurança

Antes de propor mudanças, é fundamental entender que **a maioria das tabelas marcadas como "publicamente legíveis" não é usada por este site (colegiozampieri.com.br)**. Elas são consumidas por outros sistemas que usam o mesmo Supabase:

- App do aluno/responsável (mobile)
- Automações n8n
- Portais externos

Isso significa que **mexer em RLS dessas tabelas pode quebrar esses outros sistemas**, mesmo que este site continue funcionando. Por isso, dividi o plano em três níveis de risco.

---

## ✅ Nível 1 — Seguro de aplicar (sem impacto em nada)

### 1.1 `responsaveis_senhas` — sem política SELECT
- **Estado atual:** RLS habilitada, nenhuma policy. Já é "secure by default".
- **Ação:** Apenas garantir que **continue sem nenhuma policy de SELECT/INSERT/UPDATE/DELETE pública**. Acesso só via service_role (edge functions).
- **Impacto no funcionamento:** Zero. Nada muda.

### 1.2 Funções `SECURITY DEFINER` executáveis por anon/auth (avisos Supabase linter)
- **Diagnóstico:** Funções como `find_email_by_cpf`, `find_user_context_by_cpf`, `has_role`, etc. precisam ser chamadas pelo frontend (login por CPF, etc.), então **não podem ter EXECUTE revogado** sem quebrar o login.
- **Ação:** **Marcar esses avisos como "ignorados"** com justificativa técnica na memória de segurança (são chamadas legítimas e necessárias). Sem mudanças de código/SQL.
- **Impacto:** Zero.

### 1.3 `SUPA_public_bucket_allows_listing` (bucket `zampieri`)
- **Diagnóstico:** O bucket é público para servir imagens (ex: imagens de eventos). O risco é apenas listagem.
- **Ação sugerida:** Adicionar policy que **permite SELECT individual mas bloqueia LIST** em `storage.objects` para o bucket. URLs públicas continuam funcionando.
- **Impacto:** Zero, desde que o frontend nunca faça `.list()` no bucket (a verificar — pelo que vi não faz).

### 1.4 `SUPA_rls_enabled_no_policy` (info)
- **Ação:** Identificar a tabela e decidir caso a caso. Provavelmente é `responsaveis_senhas` (item 1.1).

---

## ⚠️ Nível 2 — Requer confirmação antes de aplicar (pode quebrar outros sistemas)

Estas tabelas têm SELECT público e **não são usadas por este site**, mas quase certamente são usadas pelo app mobile / n8n via **anon key**:

| Tabela | Provável consumidor | O que quebra se restringir |
|---|---|---|
| `boletim_mensal_26` | App do aluno | Listagem de boletins |
| `boletos_26` | App do aluno / cobrança | Visualização de boletos |
| `comunicados_2026` | App do aluno | Comunicados |
| `ocorrencias_mhund` | App do aluno | Ocorrências |
| `push_tokens` | App mobile (registro de device) | Push notifications |
| `conteudos_taredas` | App do aluno | Tarefas/conteúdos |

**Antes de mexer em qualquer uma**, preciso saber:
- Esses dados são acessados por algum app externo usando a **anon key** do Supabase? (provavelmente sim)
- Se sim, esses apps possuem login Supabase real, ou usam outro mecanismo (CPF + senha custom)?

**Sem essa resposta, NÃO recomendo alterar essas policies**, pois o risco de quebrar o app do aluno/responsável é alto.

Se confirmado que existem apps externos sem login Supabase consumindo via anon, a solução correta é:
- Mover os acessos para **edge functions** que validam autenticação custom e retornam só os dados do usuário autenticado.
- Migração em fases: criar edge function → atualizar app externo → restringir RLS.

Isto é trabalho grande e fora do escopo desta sessão.

---

## ⚠️ Nível 3 — Requer cuidado, mas possível

### 3.1 `user_profiles` — SELECT público
- **Uso neste site:** `ScannerIngressos.tsx` faz `.select("user_id, username").in("user_id", [...])` para mostrar nome de quem validou o ingresso.
- **Quem chama:** apenas admins logados (página de scanner).
- **Ação proposta:** trocar policy para `authenticated` em vez de `public`. O scanner continua funcionando (admin é authenticated).
- **Risco:** Se outro sistema externo lê `user_profiles` com anon key, quebra. Pelo nome, parece ser apenas para login interno → baixo risco, mas precisa confirmação.

### 3.2 `codigos_verificacao` — SELECT/UPDATE com `USING: true`
- **Estado:** Qualquer authenticated lê/atualiza códigos de outros.
- **Ação proposta:** Restringir por `codigo_aluno` correspondente ao usuário. Precisa confirmar como o código_aluno é mapeado para o usuário logado neste fluxo (provavelmente via app do aluno, não por este site).
- **Risco:** Pode quebrar fluxo de verificação no app externo. Não usado por este site.

### 3.3 `pre_matricula` — INSERT público sem validação
- **Estado:** Form público de pré-matrícula (legítimo).
- **Ação proposta (opcional):** adicionar **rate limiting + validação** via edge function em vez de INSERT direto. Trabalho médio.
- **Impacto:** Requer refatorar o formulário público de pré-matrícula. Não quebra nada se feito corretamente, mas exige teste cuidadoso.
- **Recomendação:** deixar para uma sessão dedicada.

---

## 🎯 Recomendação final

**Nesta sessão, aplicar apenas Nível 1** (totalmente seguro):
1. Confirmar `responsaveis_senhas` sem policies (já está).
2. Marcar avisos de `SECURITY DEFINER` como ignorados com justificativa.
3. Bloquear LIST no bucket `zampieri` (mantendo SELECT individual).
4. Atualizar `@security-memory` documentando o que é intencionalmente público e por quê.

**Antes de avançar para Nível 2/3**, preciso que você confirme:

> **Pergunta:** As tabelas `boletim_mensal_26`, `boletos_26`, `comunicados_2026`, `ocorrencias_mhund`, `push_tokens`, `conteudos_taredas` e `user_profiles` são lidas por algum app/sistema externo (app mobile do aluno, n8n, portal do responsável) usando a chave anon do Supabase? Se sim, esses apps têm login real no Supabase Auth ou usam CPF/senha custom?

Com essa resposta, monto um Nível 2 seguro e faseado.
