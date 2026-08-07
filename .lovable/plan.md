# Matrícula: documentos, contrato e pagamento (pós-entrevista)

Continuação natural da pré-matrícula: depois que a entrevista é concluída, a família recebe um link único, envia a documentação, o admin confere e preenche os dados do contrato, a família assina e paga.

## Fluxo

```text
Entrevista concluída
   -> WhatsApp (template prematricula_entrevista_concluida, com botão) + e-mail
   -> /matricula?t=TOKEN  (mesmo token da pré-matrícula)
        etapa 1: upload dos documentos do checklist
        v
   Admin em /prematricula/admin analisa documentos
        aprova cada documento / pede reenvio
        preenche formulário do contrato (mesmos campos da rematrícula)
        + valor da matrícula, anuidade, desconto, forma (à vista ou parcelado)
        v
   Admin gera contrato (ZapSign, mesmo modelo, nome "[MAT] - {aluno} - Contrato")
        -> família recebe link de assinatura
        v
   Contrato assinado (webhook)
        -> libera pagamento em /matricula?t=TOKEN
        -> checkout Asaas (PIX/à vista ou cartão parcelado)
        v
   Pagamento confirmado -> e-mail de conclusão (mesmo template já existente)
```

## Tela da família — /matricula?t=TOKEN

Mesma identidade visual da pré-matrícula (card branco, verde escuro, barra de progresso). Três blocos que se abrem conforme o estágio:

1. **Documentos** — um campo por item do checklist:
   2 fotos 3x4; certidão de nascimento; RG do aluno (quando houver); CPF do aluno (quando houver); carteira de vacina; DAS – declaração de vacinação atualizada; comprovante de residência; RG e CPF do pai; RG e CPF da mãe; transferência escolar; histórico escolar.
   PDF/JPG/PNG até 10 MB por arquivo, com status por item (enviado / aprovado / reenviar, com o motivo do admin).
2. **Contrato** — aparece quando o admin gera: botão "Assinar contrato" (link ZapSign) e aviso de aguardando assinatura.
3. **Pagamento** — liberado só com contrato assinado: resumo dos valores e escolha entre à vista (PIX/cartão) ou parcelado no cartão, levando ao checkout Asaas.

Estados finais: "documentos em análise", "aguardando assinatura", "aguardando pagamento", "matrícula concluída".

## Admin — nova aba na tela de pré-matrícula

Para cadastros com entrevista concluída:

- **Documentos**: lista com visualização (URL assinada), botões Aprovar / Solicitar reenvio (com motivo, que dispara aviso à família).
- **Formulário do contrato**: mesmos campos usados na rematrícula — responsável financeiro (nome, CPF, RG, estado civil, naturalidade, nacionalidade, data de nascimento, celular, e-mail), endereço completo (CEP, logradouro, número, complemento, bairro, cidade, estado), dados do pai e da mãe, dados do aluno (nome, nascimento), curso/série, turno.
- **Valores**: anuidade total (e por extenso), percentual de desconto (e por extenso), mensalidade com desconto (e por extenso), valor da 1ª parcela, dia de vencimento, valor da matrícula, forma de pagamento permitida (à vista e/ou parcelado) e nº máximo de parcelas.
- **Ações**: Gerar contrato (envia link à família), Reenviar link, Ver status de assinatura e pagamento.

## Mensagens

- **prematricula_entrevista_concluida** (WhatsApp): reativado, com botão de URL dinâmica igual ao de agendamento — URL-base `https://colegiozampieri.com.br/matricula` e o parâmetro enviando `?t=<token>` completo. Parâmetros do corpo: {{1}} primeiro nome do responsável, {{2}} nome do aluno, {{3}} percentual de desconto.
- E-mails novos: documentos aprovados / reenvio solicitado, contrato pronto para assinatura, matrícula concluída (reaproveitando o layout atual).
- O e-mail de conclusão final segue o modelo já existente; o template de WhatsApp de conclusão fica preparado para ser ligado depois.

## Detalhes técnicos

**Banco (migrations):**
- `matriculas` — 1:1 com `prematriculas` (`prematricula_id`), status (`documentos_pendentes`, `documentos_em_analise`, `documentos_aprovados`, `contrato_gerado`, `contrato_assinado`, `pagamento_pendente`, `concluida`), campos do contrato (responsável financeiro, endereço, pai, mãe, aluno, curso, turno), valores (anuidade, extensos, desconto, mensalidade, 1ª parcela, dia de vencimento, valor da matrícula, formas permitidas, máx. parcelas), ZapSign (`contrato_gerado`, `link_contrato`, `zapsign_token`, `contrato_assinado`), Asaas (`asaas_customer_id`, `asaas_payment_id`, `checkout_id`, `checkout_url`, `forma_pagamento`, `parcelas`, `valor_pago`, `data_pagamento`), timestamps.
- `matricula_documentos` — matrícula, tipo do documento, `storage_path`, status (`enviado`, `aprovado`, `reenviar`), motivo, timestamps.
- RLS fechada (sem acesso anônimo direto); tudo passa por edge functions com service role validando o token, e por RPC/`has_role` no admin. GRANTs explícitos.

**Storage:** bucket privado `matricula-docs`; upload via edge function; admin lê por URL assinada.

**Edge functions:**
- `matricula-portal` — resolve o token, devolve o estado atual, recebe uploads e cria o checkout Asaas após assinatura.
- `matricula-admin` — valida admin pelo JWT: aprovar/rejeitar documentos, salvar o formulário do contrato e os valores, gerar contrato, reenviar links.
- `matricula-gerar-contrato` — mesma chamada ZapSign do modelo `bef1f2c6-bd16-458e-8fa7-f8bd0b907f6a`, mesmas variáveis, nome do documento `[MAT] - {nome do aluno} - Contrato`, pasta `/matricula/`.
- `zapsign-webhook` — passa a reconhecer também documentos de matrícula (pelo `external_id`), marcando `contrato_assinado`.
- `asaas-webhook` — ao confirmar pagamento de matrícula, marca `concluida` e dispara o e-mail de conclusão.

**Frontend:** `src/pages/Matricula.tsx` (portal por token, com componentes em `src/components/matricula/`), nova aba/dialog em `src/pages/PreMatriculaAdmin.tsx`, rota `/matricula` em `App.tsx`.

## O que preciso de você depois

O texto final do template `prematricula_entrevista_concluida` aprovado na Meta (com botão apontando para `https://colegiozampieri.com.br/matricula`) — até lá o envio fica pronto e desligado por um secret.
