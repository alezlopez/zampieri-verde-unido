# Reenvio de documento direto pelo link da mensagem

## Problema

Hoje, quando a pré-matrícula é aprovada com ressalvas, o botão da mensagem leva para o formulário de pré-matrícula em branco. O responsável só vê a tela de reenvio depois de digitar o CPF (e passar pela etapa 1). Isso é desnecessário: o caso já é conhecido no momento em que a mensagem é enviada.

## Como vai ficar

O botão da mensagem passa a levar para um endereço com identificação do caso. Ao abrir, a pessoa já vê direto:

- nome do aluno e protocolo;
- o motivo e a orientação da solução;
- o campo para anexar o documento pendente (boletim ou laudo);
- o botão de enviar.

Nenhum dado precisa ser digitado. Depois do envio, a mesma tela de confirmação de hoje ("Documento recebido!").

Se o link estiver inválido, vencido ou o caso já não estiver mais aguardando reenvio, a página mostra um aviso curto e o formulário normal de pré-matrícula continua acessível pelo caminho de sempre (digitando o CPF).

## Detalhes técnicos

**Edge Function `prematricula-admin-acao`**
- Na ação `aprovar_com_ressalvas`, garantir o `token` da pré-matrícula (mesmo padrão já usado em `aprovar`/`agendar`: gera e grava se não existir) e montar `linkReenvio` como `${SITE_URL}/prematricula/reenvio?t=<token>`, em vez de `${SITE_URL}/prematricula`.
- Fazer o mesmo no ramo `reprovar` com motivo de documento, se o link atual apontar para reenvio; motivo financeiro continua apontando para `/prematricula` (novo preenchimento).

**Edge Function `prematricula-enviar`**
- Nova ação `consultar_token` (JSON): recebe `t`, busca a pré-matrícula pelo token com status `aprovado_com_ressalvas` e retorna os mesmos campos já devolvidos por `consultar_cpf` (`id`, `aluno_nome`, `protocolo`, `motivo_texto`, `solucao_texto`, `ressalva_documento`). Sem token válido, retorna `ressalva: null`.
- `reenviar_documento` passa a aceitar `token` como alternativa ao par `cpf` + `id`, validando token + status; o caminho por CPF permanece inalterado.

**Frontend**
- Nova rota `/prematricula/reenvio` em `src/App.tsx`, apontando para `src/pages/PreMatricula.tsx` (mesma página).
- Em `PreMatricula.tsx`: ao montar, se houver `?t=` na URL, chamar `consultar_token`, preencher o estado `ressalva` e renderizar a tela de reenvio já existente (sem passar pelas etapas). Guardar o token no estado e enviá-lo em `enviarReenvio` quando presente.
- Estado de carregamento enquanto consulta o token e mensagem de link inválido com botão para o formulário normal.
- O botão "Não é o meu caso, continuar o formulário" continua disponível.

Nenhuma alteração no fluxo de aprovação, agendamento, e-mails ou nos templates de WhatsApp além do endereço do botão.
