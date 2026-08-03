# Verificação por código (OTP) na Rematrícula 2027

Substituir a confirmação por data de nascimento por um código de 6 dígitos enviado por WhatsApp (Meta Cloud API) ou e-mail (Resend), e usar o mesmo mecanismo para validar novo telefone/e-mail do responsável.

## Novo fluxo de entrada

```text
1. Informa CPF ou telefone  ->  lista de alunos (como hoje)
2. Escolhe o aluno
3. Escolhe onde receber o código:
     WhatsApp  (••) •••••-1234
     E-mail    jo•••@gmail.com
4. Digita o código de 6 dígitos (validade 10 min, reenvio após 60s)
5. Fluxo liberado (Aluno -> Mãe -> Pai -> Curso -> Contrato -> Pagamento)
```

A tela de data de nascimento sai do fluxo. Os canais oferecidos vêm dos contatos já cadastrados do pai/mãe, sempre mascarados — o usuário nunca vê o contato completo antes de provar que o possui.

## Validação de novo telefone/e-mail

Nas telas de Mãe e Pai, se o usuário alterar o celular ou o e-mail, o campo fica marcado como "não verificado" e um botão "Verificar" envia um código para o **novo** contato. O valor só é gravado depois que o código é confirmado; se ele desistir, o valor antigo permanece.

## Detalhes técnicos

**Banco (migration)**
- Tabela `rematricula_2027_otp`: `id_aluno`, `canal` (whatsapp/email), `destino_hash`, `codigo_hash` (sha256 + pepper), `expira_em`, `tentativas`, `consumido_em`, `ip`. RLS ativo sem políticas públicas (acesso só por RPC/edge function `service_role`).
- Tabela `rematricula_2027_sessao`: token de sessão opaco por aluno, validade ~2h, criado após OTP confirmado.
- RPC `rematricula_2027_canais(p_id_aluno)`: retorna apenas os canais disponíveis **mascarados** (sem valor real), com rate limit por IP reaproveitando `rematricula_2027_rate_hit`.
- `rematricula_2027_abrir` passa a exigir `p_sessao_token` válido em vez de `p_data_nascimento`. Mesma verificação em `rematricula_2027_salvar`.

**Edge functions (novas)**
- `rematricula-2027-otp-enviar`: recebe `id_aluno` + `canal` (ou, no caso de troca de contato, o novo destino), gera código, grava o hash, envia. Rate limit: 3 envios por 10 min por aluno e por IP.
- `rematricula-2027-otp-validar`: confere código, máximo 5 tentativas, devolve o token de sessão (ou, no modo "novo contato", devolve apenas o OK de verificação daquele campo).
- Envio WhatsApp: `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` com template de autenticação; secrets `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_OTP`.
- Envio e-mail: Resend, mesmo padrão de `enviar-confirmacao-ingresso` (`RESEND_API_KEY`).

**Frontend**
- Novo `StepCanal.tsx` (escolha do canal) e `StepCodigo.tsx` (input de 6 dígitos com reenvio) em `src/components/rematricula/`.
- `StepIdentidade.tsx` deixa de ser usado no fluxo (arquivo removido).
- `Rematricula2027.tsx`: fases `busca -> canal -> codigo -> aluno...`; guarda o token de sessão em memória e envia nas chamadas de abrir/salvar.
- `StepResponsavel.tsx`: marcação de "não verificado" + botão Verificar com modal de código para celular/e-mail alterados.

**Pré-requisitos**
- Secrets do WhatsApp Cloud API (token permanente, phone_number_id, nome do template de autenticação aprovado). Serão solicitados no formulário seguro na implementação.
- Domínio remetente verificado no Resend (já em uso hoje).
