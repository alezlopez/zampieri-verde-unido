# Pré-matrícula: bloqueio de duplicidade e confirmação do WhatsApp

Duas proteções no formulário público `/prematricula`: impedir que o mesmo aluno seja cadastrado mais de uma vez e confirmar o número de WhatsApp por código antes de o responsável seguir preenchendo.

## 1. Um aluno, uma pré-matrícula

Regra: um aluno é identificado por **nome + data de nascimento** (nome normalizado — sem acentos, espaços extras e maiúsculas/minúsculas ignoradas). Se já existir qualquer pré-matrícula para esse aluno, um novo envio é recusado, independentemente do status — inclusive reprovada.

Onde a checagem acontece:

- **Ao avançar da etapa do aluno**: assim que o responsável informa nome e data de nascimento, o sistema consulta e, se já houver cadastro, mostra o aviso na hora — sem deixar a pessoa preencher o formulário inteiro à toa.
- **No envio final**: mesma checagem no servidor, mais uma trava no banco que impede duas linhas para o mesmo aluno mesmo em envios simultâneos ou duplo clique.

Mensagem exibida: aviso de que já existe uma pré-matrícula para o aluno, com o protocolo, a data do envio e o telefone da secretaria para tratar o caso. Não são exibidos dados do responsável anterior.

A secretaria continua podendo liberar um novo envio ao excluir o registro antigo pelo painel/banco — não há autoliberação pelo site.

## 2. Confirmação do WhatsApp por código

Na etapa 1 (dados do responsável), depois de preencher nome, e-mail, CPF e WhatsApp:

1. O responsável clica em **Enviar código**.
2. Chega um código de 6 dígitos no WhatsApp informado (mesmo template de OTP já usado na rematrícula 2027).
3. Ele digita o código; validado, o número fica marcado como confirmado e o botão **Continuar** libera.
4. Se trocar o número depois, a confirmação é descartada e precisa validar de novo.
5. Reenvio de código liberado após 60 segundos; código expira em 10 minutos; até 5 tentativas por código.

Proteções contra abuso: limite por IP e por número (poucos envios por janela de minutos), com mensagem clara de "muitas tentativas, aguarde".

No envio final, o servidor confere se aquele número realmente foi confirmado — sem isso a pré-matrícula não é aceita, então não adianta burlar pela tela.

## Detalhes técnicos

**Banco (migration)**
- `prematriculas`: coluna gerada/normalizada `aluno_chave` (`lower(unaccent(trim(aluno_nome)))` via função imutável própria) + índice único `(aluno_chave, aluno_nascimento)`.
- Nova tabela `prematricula_otp` (id, telefone E.164, codigo_hash, expira_em, tentativas, consumido_em, verificado_em, ip, created_at), RLS habilitada sem policies (acesso só por service_role nas edge functions), com GRANTs para `service_role`.
- Reuso da tabela `rematricula_2027_rate_limit` via `rematricula_2027_rate_hit` para limitar envios por IP.

**Edge functions**
- Nova `prematricula-otp` (`verify_jwt = false`) com ações:
  - `enviar`: valida telefone, aplica rate limit, gera código, grava hash (helpers de `_shared/otp.ts`) e dispara o template de OTP.
  - `validar`: confere hash/expiração/tentativas, marca `verificado_em`.
- Nova ação/endpoint leve `prematricula-checar-aluno` (ou ação dentro de `prematricula-otp`) que responde apenas `{ existe, protocolo, criado_em }` para a checagem antecipada de duplicidade.
- `prematricula-enviar`: antes do insert, (a) recusa se já existir registro para o mesmo aluno (`aluno_duplicado`), (b) exige um `prematricula_otp` verificado, não consumido, para o telefone enviado nos últimos 30 minutos e o consome; trata violação do índice único como `aluno_duplicado`.

**Frontend**
- `src/components/prematricula/Etapas.tsx`: bloco de verificação do WhatsApp em `EtapaResponsavel` (botão enviar código, input de 6 dígitos, contador de reenvio, estado verificado).
- `src/pages/PreMatricula.tsx`: estado `whatsVerificado` + telefone verificado; `validarEtapa` da etapa 0 exige verificação; etapa 1 (aluno) chama a checagem de duplicidade antes de avançar; tratamento dos erros `aluno_duplicado` e `otp_nao_verificado` no envio, com tela de aviso dedicada.
- Sem mudanças nos fluxos de matrícula, contrato ou pagamento.
