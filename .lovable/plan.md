# Pesquisa de intenção de rematrícula (WhatsApp com botões)

Alcançar também quem ainda **não iniciou** a rematrícula, perguntando a intenção em uma única mensagem com botões, registrando a resposta e agindo conforme ela.

## Como funciona

1. **Disparo**: mensagem de template com 3 botões para o responsável financeiro dos alunos liberados que ainda não concluíram nem cancelaram (com ênfase em "não iniciou"):
   - "Vou rematricular"
   - "Ainda não decidi"
   - "Não vou rematricular"
2. **Resposta** chega no n8n, que devolve ao sistema qual botão foi clicado.
3. **Roteamento**:
   - *Vou rematricular* → resposta imediata com o link do funil (`/rematricula2027`); o follow-up normal (parou / assinar / pagar) assume daí em diante.
   - *Ainda não decidi* → entra em lembrete com prazo: reenvio em 3 e depois 5 dias, com urgência crescente conforme o fim da fase de desconto se aproxima.
   - *Não vou rematricular* → alerta interno imediato para a secretaria (sino do painel) e, só depois da resposta inicial, um segundo toque perguntando o motivo (botões: financeiro, mudança de cidade/escola, insatisfação, outro). O motivo também gera notificação.
4. **Sem resposta**: até 2 reenvios da pergunta (3 e 7 dias) e depois para.
5. **Painel**: nova aba "Intenção" na tela de follow-up, com contadores (sem resposta, vai rematricular, indeciso, não vai, sem contato), motivo declarado, data da resposta, botão de envio manual e pausa individual.

## Templates a aprovar na Meta (pt_BR, UTILITY, com botões de resposta rápida)

- `rematricula2027_intencao_1` — pergunta inicial ({{1}} responsável, {{2}} aluno, {{3}} prazo/fase) + 3 botões.
- `rematricula2027_intencao_lembrete` — para o indeciso ({{1}}, {{2}}, {{3}} data limite da fase) + mesmos botões.
- `rematricula2027_intencao_motivo` — segundo toque de motivo + 4 botões.
- `rematricula2027_intencao_link` — confirmação com link do funil para quem respondeu "vou rematricular".

O roteamento dos botões e o repasse da resposta ficam no n8n, seguindo o padrão já usado no funil principal.

## Detalhes técnicos

**Migration**
- Tabela `rematricula_2027_intencao`: `id_aluno` (PK, FK `alunos_rematricula_2027`), `status` (`sem_resposta` | `vai_rematricular` | `indeciso` | `nao_vai`), `motivo`, `motivo_texto`, `respondido_em`, `origem`, `destino`, `pausado`, `created_at`, `updated_at`. GRANTs + RLS (leitura para setor `rematricula` via `has_setor`, escrita só `service_role`); validação de valores por trigger, não CHECK.
- Tabela `rematricula_2027_intencao_envios` (id_aluno, tipo, sequencia, template, destino, sucesso, payload, enviado_em) com único (id_aluno, tipo, sequencia), espelhando `rematricula_2027_followup_envios`.
- RPC `rematricula_2027_admin_intencao_listagem` e `rematricula_2027_admin_intencao_pausar`.

**Edge function `rematricula-2027-intencao`** (nova, reutilizando `_shared/rematricula-followup.ts` para destinatário/envio via `enviarTemplateWebhook`)
- `modo: "cron"` — seleciona `rematricula_liberada = true`, não concluída, não cancelada, não pausada; dispara a pergunta inicial para quem nunca recebeu; aplica a cadência de lembrete (indeciso: 3 e 5 dias; sem resposta: 3 e 7 dias); idempotente pela tabela de envios.
- `modo: "manual"` — JWT + `has_setor('rematricula')`, reenvia um tipo específico para um aluno.

**Edge function `rematricula-2027-intencao-resposta`** (nova, pública, `verify_jwt = false` em `supabase/config.toml`, protegida por `N8N_WEBHOOK_TOKEN` no header)
- Recebe `{ id_aluno | telefone, resposta, motivo? }` do n8n, grava em `rematricula_2027_intencao`, e:
  - `vai_rematricular` → dispara `rematricula2027_intencao_link`;
  - `nao_vai` → `notificar_admin` (setor `rematricula`, link `/rematricula2027/followup`) e agenda/dispara o template de motivo;
  - motivo recebido → grava e notifica.

**Agendamento**: `pg_cron` diário às 13:00 UTC (10:00 Brasília) chamando a função de intenção, logo após a rotina de follow-up já existente.

**Frontend** — `src/pages/Rematricula2027Followup.tsx`: aba/etapa "Intenção" com os contadores, badges de status por cor, motivo, histórico de envios, botões de envio manual e switch de pausa, no mesmo padrão visual das etapas atuais.

## Antes de ligar

Os 4 templates precisam estar aprovados na Meta e mapeados no n8n, incluindo o nó que devolve a resposta dos botões para o endpoint novo. A rotina entra com chave de ativação, para testar com um aluno antes do disparo geral.
