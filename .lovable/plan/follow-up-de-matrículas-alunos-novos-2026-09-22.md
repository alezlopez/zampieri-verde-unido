# Follow-up de matrículas (alunos novos)

Mesma lógica do follow-up da rematrícula, agora para quem está no funil de aluno novo: pré-matrícula aprovada, entrevista, documentos e contrato. Nova tela **Follow-up de matrículas (alunos novos)**, com uma aba por etapa.

## Etapas acompanhadas

| # | Etapa | Quem entra | Mensagens |
|---|---|---|---|
| 1 | Aprovado e não agendou | pré-matrícula aprovada, sem entrevista marcada | até 3 (1, 3 e 6 dias) — **só envia se houver vaga na série/turno pretendido** |
| 2.1 | Lembrete de entrevista | entrevista marcada | 2 (1 dia antes e 2 horas antes) |
| 2.2 | Não compareceu | horário passou e a entrevista não foi concluída | 1, com link para remarcar |
| 3 | Documentos pendentes | entrevista concluída, documentos não enviados/aprovados | até 3 (1, 3 e 6 dias) |
| 4 | Contrato pendente | documentos aprovados, contrato não gerado ou não assinado | até 3 (1, 3 e 6 dias) |

Sem vaga na etapa 1, a família não recebe cobrança para agendar; o caso aparece na aba marcado como "sem vaga" e a secretaria decide (lista de espera já existe).

## Templates para criar na Meta (UTILITY, pt_BR)

Todos com botão de URL levando ao link indicado.

1. `matricula_agendar_1` / `_2` / `_3` — {{1}} responsável, {{2}} aluno, {{3}} série
   "Olá, {{1}}! A pré-matrícula de {{2}} para {{3}} foi aprovada e já podemos marcar a entrevista familiar. Escolha o melhor horário pelo link abaixo."
   (2 e 3 com urgência crescente: vagas limitadas / último lembrete)
   Botão: agendar → `/prematricula/agendar?t=<token>`
2. `matricula_entrevista_lembrete` — {{1}} responsável, {{2}} aluno, {{3}} data, {{4}} hora
   "Olá, {{1}}! Lembrete da entrevista familiar de {{2}}: {{3}} às {{4}}, no Colégio Zampieri."
   Usado nos dois disparos (1 dia antes e 2 h antes).
3. `matricula_entrevista_faltou` — {{1}} responsável, {{2}} aluno, {{3}} data
   "Olá, {{1}}! Sentimos sua falta na entrevista de {{2}} em {{3}}. Remarque um novo horário pelo link abaixo."
   Botão: remarcar → `/prematricula/agendar?t=<token>`
4. `matricula_documentos_1` / `_2` / `_3` — {{1}} responsável, {{2}} aluno
   "Olá, {{1}}! Para seguir com a matrícula de {{2}}, faltam os documentos. Envie pelo link abaixo."
   Botão: portal → `/matricula?t=<token>`
5. `matricula_contrato_1` / `_2` / `_3` — {{1}} responsável, {{2}} aluno
   "Olá, {{1}}! Os documentos de {{2}} foram aprovados. Falta gerar e assinar o contrato para concluir a matrícula."
   Botão: portal → `/matricula?t=<token>`

Destinatário: o responsável cadastrado na pré-matrícula (WhatsApp informado); na etapa de contrato, o responsável financeiro da matrícula quando já houver.

## Detalhes técnicos

**Migration**
- Tabela `matricula_followup_envios` (id, prematricula_id, etapa, sequencia, template, destino, sucesso, payload, enviado_em) com único (prematricula_id, etapa, sequencia) para nunca repetir.
- Coluna `followup_pausado boolean default false` em `prematriculas`.
- GRANTs + RLS: leitura para `has_setor('matricula')`, escrita só service_role.
- RPC `matricula_followup_listagem()` (SECURITY DEFINER, exige setor matricula) devolvendo, por pré-matrícula ativa: dados do responsável/aluno, status, agendamento vigente, status da matrícula e documentos, disponibilidade de vaga da série/turno e envios já feitos.

**Edge function `matricula-followup`** (`verify_jwt = false`, chamada por cron e pelo painel)
- Modo `cron`: classifica cada caso na etapa, aplica a cadência (1/3/6 dias desde a última atividade; etapa 2.1 por proximidade do horário: janela de 24 h e de 2 h; etapa 2.2 a partir de 2 h após o horário perdido), pula pausados, cancelados, desistentes e concluídos, e na etapa 1 pula quem está sem vaga. Envia por `enviarTemplateWebhook` e grava em `matricula_followup_envios` (idempotente).
- Modo `manual`: JWT + `has_setor('matricula')`, reenvia uma mensagem específica.
- Chave de ativação `MATRICULA_FOLLOWUP_ATIVO` para testar com um caso antes do disparo geral.
- Novo módulo `_shared/matricula-followup.ts` com etapas, templates, cadência e escolha do destinatário (reaproveitando o padrão de `rematricula-followup.ts`).

**Agendamento**
- `pg_cron` de hora em hora (`0 * * * *`), porque o lembrete de 2 horas antes da entrevista exige granularidade horária; as demais etapas só disparam uma vez por dia por caso.

**Frontend**
- Nova página `src/pages/MatriculaFollowup.tsx`, rota `/matricula/followup` com `RequireAdmin setor="matricula"`, no mesmo padrão visual de `Rematricula2027Followup.tsx`: abas por etapa, contadores, busca, contato por WhatsApp/e-mail, histórico de mensagens (1/2/3 com data), botão "Reenviar mensagem" e switch "Pausar follow-up". Na etapa 1, etiqueta de vaga disponível/sem vaga.
- Link para a nova tela no card de matrículas do `AdminHome.tsx`.

## Antes de ligar

Os 11 templates precisam estar aprovados na Meta e mapeados no n8n. Entra no ar desligado, para você testar com um caso antes do disparo geral.
