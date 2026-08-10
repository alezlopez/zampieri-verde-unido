# Ajustes na documentação e na aprovação da matrícula

Três correções no fluxo de matrícula: travar reenvio de documentos, corrigir a liberação dos dados para a família e restringir a opção "aguardando escola".

## 1. Documento enviado não pode ser trocado

Hoje a família pode substituir qualquer documento a qualquer momento. Passa a valer:

- Documento com status **enviado**, **em análise** ou **aprovado**: o botão de envio some e aparece só o nome do arquivo com o status.
- O reenvio só é liberado quando a escola pedir — ou seja, quando o documento estiver **rejeitado** (rejeição individual) ou quando a secretaria clicar em **Solicitar reenvio**.
- A trava também vale no servidor: uma tentativa de upload de item já enviado e não rejeitado é recusada.

Quando a secretaria pede reenvio, a família recebe aviso por e-mail (já existe) e agora também por WhatsApp, com um novo template:

- Nome sugerido: `matricula_documentos_reenvio` (precisa ser criado e aprovado na Meta; o nome pode ser trocado depois pelo secret `WHATSAPP_TPL_MATRICULA_REENVIO`).
- Variáveis, nesta ordem: 1) primeiro nome do responsável, 2) nome do aluno, 3) lista dos documentos a reenviar, 4) link do painel da família.

## 2. Aprovação e liberação dos dados

Fluxo correto, na ordem:

1. A secretaria analisa e aprova (ou rejeita) cada documento.
2. Com todos os obrigatórios aprovados (ou marcados como "aguardando escola"), o bloco de valores financeiros fica em destaque para preenchimento.
3. Só depois de salvar anuidade, mensalidade com desconto, valor da matrícula e dia de vencimento é que o botão **Liberar preenchimento dos dados** habilita — é ele que libera o formulário da família.

Correção do problema relatado ("salva mas não libera"): a tela do admin não atualizava o registro aberto depois de salvar, então a validação dos valores continuava vendo os campos vazios e o botão seguia bloqueado. Passa a ressincronizar o registro aberto após cada ação.

Também fica mais claro o motivo do bloqueio: o aviso passa a dizer se falta aprovar documento ou se faltam valores.

## 3. "Já solicitei na escola anterior"

A caixa de "aguardando prazo de entrega" aparece **apenas no Histórico escolar**. Na Declaração de transferência ela deixa de existir — o documento tem que ser enviado.

## Detalhes técnicos

**Compartilhado**
- `_shared/matricula-docs.ts`: `permite_aguardando: false` em `declaracao_transferencia`; helper `podeReenviar(status)` (só `pendente` e `rejeitado`).
- `_shared/prematricula-mensagens.ts`: entrada `documentos_reenvio` em `TEMPLATES` (envVar `WHATSAPP_TPL_MATRICULA_REENVIO`, padrão `matricula_documentos_reenvio`, params nome/aluno/lista/link).

**Edge functions**
- `matricula-portal`: `upload` recusa (`documento_bloqueado`) quando o item já está `enviado`/`em_analise`/`aprovado`/`aguardando_escola`; `aguardando_escola` já valida por `PERMITE_AGUARDANDO`, que passa a conter só o histórico.
- `matricula-admin`: `aprovar_documentos` deixa de exigir valores e passa a exigir que todos os obrigatórios estejam aprovados/aguardando; nova ação `liberar_dados` (exige `valoresProntos` + documentos aprovados) que grava `status = documentos_aprovados` e `documentos_aprovados_em`, mantendo a notificação; `solicitar_reenvio` passa a limpar o status dos itens listados para permitir novo upload.

**Frontend**
- `src/pages/MatriculaAdmin.tsx`: `useEffect` que resincroniza `aberta` a partir de `lista` após `carregar()`; botão "Aprovar toda a documentação" sem a trava de valores; novo botão "Liberar preenchimento dos dados" com as duas condições; mensagens de bloqueio específicas.
- `src/pages/Matricula.tsx`: input de arquivo só quando `pendente` ou `rejeitado`; checkbox "aguardando escola" apenas quando `d.permite_aguardando`; mensagem de status para itens travados.
