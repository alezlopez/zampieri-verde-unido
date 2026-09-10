# Pré-matrícula: reprovação com motivo, aprovação com ressalvas e reenvio de documentos

## 1. Decisão na análise (painel)

Ao abrir uma pré-matrícula pendente, três botões:

- **Aprovar** — segue o fluxo atual (libera agendamento da entrevista).
- **Aprovar com ressalvas** — libera apenas o reenvio do documento pendente.
- **Reprovar** — encerra o caso.

Em "Reprovar" e "Aprovar com ressalvas" o motivo passa a ser **obrigatório**, escolhido em uma lista. Ao escolher o motivo, o texto do motivo e o texto da solução aparecem preenchidos na tela (somente leitura) para conferência antes de confirmar.

Motivos disponíveis:

| Motivo | Decisões permitidas |
| --- | --- |
| Financeiro | Apenas Reprovar |
| Laudo não enviado | Reprovar ou Aprovar com ressalvas |
| Boletim não enviado | Reprovar ou Aprovar com ressalvas |

Textos fixos (enviados também no webhook):

- **Financeiro** — Motivo: "Um dos critérios para realizar a matrícula do Colégio Zampieri, é estar com o CPF sem registros nos orgãos de proteção ao crédito (SPC e SERASA)." Solução: "Desta forma, você pode preencher novamente o formulário com o CPF do outro responsável financeiro pelo aluno (pai ou mãe). Clique no botão abaixo."
- **Laudo não enviado** — Motivo: "Foi selecionado que existe acompanhamento médico concluído ou em andamento, mas o laudo não foi encaminhado ou encaminhado de forma erronea." Solução: "Desta forma, você pode reenviar o documento clicando no botão abaixo."
- **Boletim não enviado** — Motivo: "Não conseguimos identificar o boletim de notas atual, ele pode ter sido enviado de forma incompleta ou estar desatualizado." Solução: "Desta forma, você pode reenviar o documento clicando no botão abaixo."

## 2. Reenvio pelo responsável

Na etapa 1 de `/prematricula`, ao digitar o CPF, o sistema reconhece um cadastro já existente com ressalvas e abre uma tela de reenvio: mostra o nome do aluno, o texto do motivo, o texto da solução e o campo para anexar o novo arquivo (boletim ou laudo, conforme o motivo). Sem código de confirmação — basta o CPF.

Se o CPF pertencer a um cadastro sem ressalvas, o comportamento atual de duplicidade continua igual.

Ao enviar o arquivo, o caso volta para o painel com o status **"Reenviado - aguardando análise"**, listado junto com os pendentes, e o analista pode novamente aprovar, aprovar com ressalvas ou reprovar. O arquivo anterior é substituído e o histórico do motivo anterior fica registrado no caso.

## 3. Agendamento da entrevista

O link/etapa de agendamento só é liberado no status **Aprovado**. Em "Aprovado com ressalvas" nenhum agendamento é permitido — nem por link antigo — apenas o reenvio.

## 4. Mensagens

Cada decisão dispara o webhook do n8n com os campos novos: `decisao`, `motivo_codigo`, `motivo_titulo`, `motivo_texto`, `solucao_texto` e o link de ação (formulário de reenvio ou novo preenchimento). O e-mail correspondente passa a exibir motivo + solução.

## Detalhes técnicos

**Migration**
- `prematriculas`: `motivo_codigo text`, `motivo_texto text`, `solucao_texto text`, `ressalva_documento text` (`boletim` | `laudo`), `reenviado_em timestamptz`.
- Novos valores de `status`: `aprovado_com_ressalvas` e `reenviado_aguardando_analise` (validação por trigger, não CHECK).

**Edge Functions**
- `_shared/prematricula-motivos.ts`: catálogo único dos 3 motivos (código, título, texto, solução, decisões permitidas, documento exigido).
- `prematricula-admin-acao`: ação `reprovar` passa a exigir `motivo_codigo` válido; nova ação `aprovar_com_ressalvas` (exige motivo 2 ou 3), gravando os textos e o documento pendente. Aceita os status `pendente` e `reenviado_aguardando_analise`.
- `prematricula-enviar`: nova ação/rota `consultar_cpf` (retorna se há caso com ressalva, aluno, motivo e documento pendente) e `reenviar_documento` (valida CPF + id, sobe o arquivo no bucket privado, atualiza o caminho e move para `reenviado_aguardando_analise`). Validação com zod, limite de 10 MB e tipos PDF/JPG/PNG.
- `prematricula-agenda` e a ação de agendamento: bloquear quando o status não for `aprovado_aguardando_agendamento`.
- `_shared/prematricula-mensagens.ts`: novos eventos `reprovada` (com motivo/solução), `aprovada_com_ressalvas` e `reenvio_recebido`, com os campos extras no payload do webhook.

**Frontend**
- `src/components/prematricula/motivos.ts`: mesmo catálogo no cliente.
- `src/pages/PreMatriculaAdmin.tsx`: bloco de decisão com Select de motivo, prévia dos textos, três botões, novos rótulos/cores de status e filtros para "Aprovado com ressalvas" e "Reenviado - aguardando análise".
- `src/pages/PreMatricula.tsx` + `src/components/prematricula/`: verificação do CPF na etapa 1 e nova tela de reenvio.
