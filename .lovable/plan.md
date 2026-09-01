# Follow-up automático da Rematrícula 2027 (WhatsApp)

Automatizar a cobrança de quem parou no meio do processo, com até 3 mensagens por etapa, disparadas por rotina diária, e cancelamento automático de quem assinou e não pagou.

## Etapas acompanhadas

| Etapa | Quem é | Mensagens |
|---|---|---|
| Começou e parou | atualizou dados, não gerou contrato | 3 |
| Contrato não assinado | contrato gerado, sem assinatura | 3 |
| Assinou e não pagou | contrato assinado, pagamento pendente | 3 + cancelamento |

Cadência sugerida: 1ª mensagem 1 dia após a última atividade, 2ª após 3 dias, 3ª após 6 dias. Para "assinou e não pagou" a 3ª mensagem é o aviso final e o prazo de 3 dias começa nela.

## Templates sugeridos (para você criar na Meta, categoria UTILITY, pt_BR)

São 3 templates por etapa (9 no total). Todos com parâmetros no corpo e botão de URL dinâmica levando a colegiozampieri.com.br/rematricula2027.

### A. Começou e parou (antes do contrato)
1. `rematricula2027_parou_1`
   "Olá, {{1}}! Vimos que você começou a rematrícula de {{2}} para 2027, mas ainda não finalizou. É rapidinho: revise os dados e gere o contrato pelo link abaixo."
2. `rematricula2027_parou_2`
   "Olá, {{1}}! A rematrícula de {{2}} continua pendente. As vagas por turno são limitadas e só ficam garantidas após a conclusão. Retome de onde parou pelo link abaixo."
3. `rematricula2027_parou_3`
   "Olá, {{1}}! Último lembrete sobre a rematrícula de {{2}}. Se tiver qualquer dúvida, fale com a secretaria. Para concluir agora, use o link abaixo."

### B. Contrato gerado e não assinado
1. `rematricula2027_assinar_1`
   "Olá, {{1}}! O contrato de rematrícula de {{2}} já está pronto para assinatura digital. Leva menos de 2 minutos: assine pelo link abaixo."
2. `rematricula2027_assinar_2`
   "Olá, {{1}}! O contrato de {{2}} segue aguardando sua assinatura. Enquanto não for assinado, a vaga no turno escolhido não fica reservada."
3. `rematricula2027_assinar_3`
   "Olá, {{1}}! Aviso final: o contrato de rematrícula de {{2}} ainda não foi assinado. Assine pelo link abaixo para garantir a vaga."

### C. Assinou e não pagou (prioridade)
1. `rematricula2027_pagar_1`
   "Olá, {{1}}! O contrato de {{2}} foi assinado. Falta só o pagamento de {{3}} para concluir a rematrícula 2027. Pague pelo link abaixo (PIX, boleto ou cartão)."
2. `rematricula2027_pagar_2`
   "Olá, {{1}}! A rematrícula de {{2}} está a um passo de ser concluída: falta o pagamento de {{3}}. Se o código PIX expirou, gere um novo no link abaixo."
3. `rematricula2027_pagar_3` (aviso final)
   "Olá, {{1}}. A rematrícula de {{2}} continua sem o pagamento de {{3}}. Sem a confirmação em até 3 dias ({{4}}), o contrato será cancelado e a vaga liberada para outra família. Para manter a vaga, pague pelo link abaixo."

Parâmetros: {{1}} responsável, {{2}} aluno, {{3}} valor, {{4}} data limite. Botão URL: `https://colegiozampieri.com.br/rematricula2027`.

## Como o envio funciona

Mantemos o padrão atual: o sistema não chama a Meta direto, envia o payload para o webhook do n8n (`templateswa`), que dispara o template.

## Detalhes técnicos

1. **Migration**
   - Tabela `rematricula_2027_followup_envios` (id, id_aluno, etapa, sequencia 1..3, template, destino, enviado_em, sucesso, payload) com índice único (id_aluno, etapa, sequencia) para nunca repetir a mesma mensagem.
   - Colunas em `alunos_rematricula_2027`: `followup_pausado boolean default false`, `prazo_cancelamento_em timestamptz`.
   - GRANTs + RLS: leitura para staff do setor rematrícula, escrita só service_role.

2. **Edge function `rematricula-2027-followup`**
   - Modo `cron` (sem usuário): seleciona alunos não concluídos, não cancelados, com `rematricula_liberada = true` e não pausados; classifica a etapa com a mesma regra da tela de follow-up; calcula qual sequência é devida pela idade da última atividade (1/3/6 dias); pula quem é isento na etapa C; envia via `enviarTemplateWebhook` e registra em `rematricula_2027_followup_envios`.
   - Na 3ª mensagem da etapa C grava `prazo_cancelamento_em = now() + 3 dias`.
   - Passada de cancelamento: alunos com `prazo_cancelamento_em` vencido e ainda não pagos → chama a mesma rotina do `rematricula-2027-admin-cancelar` (estorno não se aplica, cancela contrato ZapSign, cancela cobrança pendente no Asaas, reseta o aluno) com motivo "Cancelamento automático por falta de pagamento".
   - Modo `manual` (com JWT + `has_setor('rematricula')`): reenvia uma mensagem específica para um aluno, a partir do painel.
   - Idempotente: nunca envia duas vezes a mesma (aluno, etapa, sequência); se o aluno avança de etapa, o contador da nova etapa começa do zero.

3. **Agendamento**
   - `pg_cron` uma vez por dia às 13:00 UTC (10:00 Brasília) chamando a função. Roda 1x/dia; é o mínimo necessário para respeitar a cadência de dias e o prazo de 3 dias, com atraso máximo de 24h.

4. **UI — `src/pages/Rematricula2027Followup.tsx`**
   - Em cada linha: quais mensagens já foram enviadas (1/2/3) e quando, botão "Reenviar mensagem", switch "Pausar follow-up" e, na etapa C, o prazo de cancelamento com destaque quando faltarem menos de 24h.
   - Filtro extra "com follow-up pausado".

## Confirmações antes de implementar

- O cancelamento automático deve mesmo executar sozinho após o prazo, ou prefere que ele apenas marque "pronto para cancelar" e a secretaria confirme com um clique?
- Manda para mãe e pai (quando houver os dois números) ou só para o responsável financeiro?
