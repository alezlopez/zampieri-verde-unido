## Reenvio inteligente do link de confirmação no fluxo de login

### Resumo
Detectar automaticamente quando o usuário tenta logar com uma conta que ainda não confirmou o e-mail, e oferecer um botão para reenviar o link de confirmação ali mesmo — sem precisar de menu separado.

### Como vai funcionar (UX)

**Fluxo:**
1. Usuário digita CPF + senha e clica em "Entrar"
2. Sistema tenta `signInWithPassword`
3. Se o Supabase retornar erro `Email not confirmed` (código `email_not_confirmed`):
   - Em vez de mostrar toast vermelho genérico, exibir um **alerta amarelo/âmbar dentro do Card** com:
     - Ícone de alerta
     - Texto: "Sua conta ainda não foi confirmada. Verifique seu e-mail `******xxxx@dominio.com` ou clique abaixo para reenviar o link."
     - Botão: **"Reenviar link de confirmação"**
4. Ao clicar no botão de reenvio:
   - Chama `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })`
   - Toast verde: "Link reenviado! Verifique sua caixa de entrada e spam."
   - Botão fica desabilitado por 60s com contador ("Reenviar em 45s") para evitar spam/rate limit
5. Se for outro tipo de erro (senha errada, etc.) → toast vermelho normal como hoje

**Para o fluxo de cadastro:**
- Quando o usuário tenta se cadastrar e o Supabase retorna que o e-mail já existe mas não foi confirmado, mostrar o mesmo alerta com botão de reenviar (em vez de erro genérico).

### Mudanças técnicas

**Arquivo: `src/pages/EventosLogin.tsx`**

1. Novos estados:
   - `unconfirmedEmail: string | null` — guarda o e-mail descoberto via CPF quando o login falha por não-confirmação
   - `resendCooldown: number` — segundos restantes até poder reenviar de novo
   - `resending: boolean`

2. Modificar `handleSubmit` (bloco do login CPF):
   - Após `loginWithCpf`, inspecionar `error.message` ou `error.code`
   - Se contiver `"Email not confirmed"` ou `"email_not_confirmed"`:
     - Buscar o e-mail via `find_email_by_cpf` (já existe RPC)
     - `setUnconfirmedEmail(email)` — isso dispara o alerta condicional na UI
     - **Não** mostrar toast vermelho
   - Outros erros: comportamento atual (toast)

3. Modificar `handleSubmit` (bloco do cadastro):
   - Se `registerWithCpf` retornar erro indicando "User already registered" mas não confirmado, oferecer reenvio também

4. Novo handler `handleResendConfirmation`:
   - Chama `supabase.auth.resend({ type: 'signup', email: unconfirmedEmail, options: { emailRedirectTo: window.location.origin } })`
   - Toast de sucesso ou erro (rate limit → "Aguarde alguns minutos")
   - Inicia cooldown de 60s via `setInterval`

5. Bloco UI condicional (renderizado quando `unconfirmedEmail` existe):
   - Componente `Alert` com `variant` âmbar (usar classes Tailwind: `bg-amber-50 border-amber-200 text-amber-900`)
   - Ícone `MailWarning` ou `AlertCircle` do lucide-react
   - E-mail mascarado (reusa `maskEmail` já existente)
   - Botão "Reenviar link de confirmação" com cooldown
   - Aparece logo acima do formulário

6. Limpar `unconfirmedEmail` quando o usuário muda de aba (login ↔ cadastro ↔ admin) ou edita o CPF.

### Por que essa abordagem
- Zero fricção: usuário não precisa sair do fluxo nem encontrar um link escondido
- Mostra exatamente quando faz sentido (após tentativa de login falha por não-confirmação)
- Cooldown de 60s previne abuso e respeita rate limit do Supabase
- Reusa toda a infraestrutura existente (`find_email_by_cpf`, `maskEmail`, padrão visual)

### O que NÃO muda
- Nenhum backend, RLS, RPC, edge function ou tabela
- Nenhum outro fluxo (esqueci senha, login admin, cadastro inicial) é afetado além do tratamento de erro
