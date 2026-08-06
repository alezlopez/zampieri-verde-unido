# Pré-matrícula — formulário público, aprovação e agenda de entrevistas

Nova rota pública `/prematricula` com formulário em 6 etapas, painel de gestão no admin, mensagens automáticas por WhatsApp + e-mail e agendamento de Entrevista Familiar.

## Fluxo do responsável

```text
/prematricula (6 etapas)
        v
  envia -> status: Pendente          -> msg 1 (recebemos sua pré-matrícula)
        v
  admin aprova/reprova o CPF
        v
  Aprovado - Aguardando agendamento  -> msg 2 (com link único para agendar)
  Reprovado                          -> msg 3
        v
  responsável abre /prematricula/agendar?t=TOKEN e escolhe horário
        v
  Entrevista agendada                -> msg de confirmação do horário
        v
  entrevistador conclui + desconto
        v
  Entrevista concluída               -> msg 4 (com desconto aplicado)
```

## Etapas do formulário

1. **Dados do responsável** — nome, e-mail, CPF, WhatsApp.
2. **Dados do aluno** — nome, data de nascimento, série pretendida, turno (Manhã/Tarde), escola atual, tipo de escola (Pública/Privada).
3. **Histórico de aprendizagem** — já repetiu ano; upload opcional do boletim (PDF/JPG/PNG, até 10 MB); dificuldade em leitura/escrita/matemática; atendimento educacional complementar.
4. **Desenvolvimento e comportamento** — dificuldade de atenção; diagnóstico/suspeita (diagnosticado, em avaliação, não) — ao escolher "diagnosticado" ou "em avaliação" abre upload de laudo/relatório; dificuldade de socialização.
5. **Saúde e apoio** — uso contínuo de medicação (e qual, se sim), alergias/restrições e observações de saúde.
6. **Consentimento** — declaração de veracidade + aceite da Política de Privacidade; botão "Finalizar e enviar".

Visual seguindo as telas enviadas: card branco centralizado, cabeçalho "Pré-matrícula – Colégio Zampieri", barra de progresso verde com "Etapa X de 6" e percentual, botões Voltar/Avançar (verde) e o final em destaque. Validação por etapa (CPF válido, e-mail, data, obrigatórios) usando os utilitários de máscara já existentes.

## Painel admin

Nova página `/prematricula/admin` (protegida pelo guard admin, com atalho em `/admin`):

- Lista com filtros por status e busca por nome/CPF.
- Colunas: aluno, série/turno, responsável, contatos, status, data de envio.
- Linha expansível/dialog com **todas** as respostas das 6 etapas e links assinados para boletim e laudo.
- Ações conforme o status:
  - Pendente: **Aprovar CPF** / **Reprovar** (com motivo).
  - Entrevista agendada: campo de desconto (5/10/15/20/25/30%), observações do entrevistador e **Concluir entrevista**.
- Aba/bloco de **Agenda**: configuração das regras de disponibilidade (dias da semana, horário inicial e final, duração da entrevista, capacidade simultânea, bloqueio de datas específicas) e visão dos horários já reservados.

## Mensagens

Cada transição dispara WhatsApp (Cloud API, mesma infraestrutura de templates já usada no OTP) **e** e-mail (Resend), em 4 momentos: recebimento, aprovação, reprovação e conclusão da entrevista (+ confirmação de agendamento). Os textos/templates ficam num único arquivo compartilhado — assim que você enviar os templates aprovados, é só substituir o conteúdo e o nome do template Meta, sem mexer no restante.

## Detalhes técnicos

**Banco (migrations):**
- `prematriculas` — dados do responsável, do aluno, respostas das etapas 3–5 (campos tipados + jsonb para múltiplas escolhas), caminhos dos arquivos, `status` (`pendente`, `aprovado_aguardando_agendamento`, `reprovado`, `entrevista_agendada`, `entrevista_concluida`), `motivo_reprovacao`, `desconto_percentual`, `observacoes_entrevista`, token de acesso (hash), timestamps de cada transição. RLS: sem acesso público direto; admin lê/edita via RPC `SECURITY DEFINER`; escrita pública só pela edge function com service role.
- `prematricula_agenda_regras` — dia da semana, hora início, hora fim, duração (min), capacidade, ativo.
- `prematricula_agenda_bloqueios` — datas/intervalos indisponíveis.
- `prematricula_agendamentos` — pré-matrícula, data/hora, status, criado em.
- Todas com `GRANT` explícito e RLS habilitada.

**Storage:** bucket privado `prematricula-docs`; upload pela edge function; admin vê por URL assinada.

**Edge functions:**
- `prematricula-enviar` — valida o payload (zod), grava, salva arquivos, gera token, dispara mensagem 1.
- `prematricula-admin-acao` — aprovar/reprovar/concluir entrevista; valida papel admin pelo JWT; dispara a mensagem correspondente.
- `prematricula-agenda` — resolve slots livres a partir das regras (menos bloqueios e reservas) e confirma o agendamento pelo token.
- `_shared/prematricula-mensagens.ts` — templates de WhatsApp e e-mail em um só lugar.

**Frontend:** `src/pages/PreMatricula.tsx` (wizard com componentes por etapa em `src/components/prematricula/`), `src/pages/PreMatriculaAgendar.tsx` (acesso por token), `src/pages/PreMatriculaAdmin.tsx`; rotas em `App.tsx` e atalho em `AdminHome.tsx`.

## O que preciso de você depois

Os 4 textos/templates das mensagens (recebimento, aprovação, reprovação, conclusão). Até lá entram textos provisórios já no formato final, prontos para troca.
