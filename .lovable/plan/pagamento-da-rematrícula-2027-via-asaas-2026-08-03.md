# Pagamento da Rematrícula 2027 via Asaas

Fecha o fluxo de `/rematricula2027`: depois do contrato assinado, o responsável escolhe a forma de pagamento, paga no checkout do Asaas e a rematrícula é marcada como concluída automaticamente.

## Como vai funcionar para o usuário

1. Ao final do wizard (ou ao retomar um aluno já cadastrado), a tela mostra o contrato para assinatura.
2. Enquanto `contrato_assinado` for falso, o bloco de pagamento aparece bloqueado com a mensagem "Assine o contrato para liberar o pagamento" e um botão "Já assinei — verificar". A tela também revalida sozinha a cada poucos segundos.
3. Com o contrato assinado, aparece a escolha de pagamento:
   - **PIX à vista** — valor promocional
   - **Cartão à vista** — valor promocional
   - **Cartão parcelado (2x a 12x)** — valor promocional parcelado, com o valor da parcela exibido
4. Ao confirmar, o usuário é levado ao checkout do Asaas. Ao voltar, a tela mostra "Pagamento em processamento" e passa para "Rematrícula concluída" assim que o Asaas confirmar.
5. Se o aluno já tiver pago, ao buscar de novo ele cai direto na tela de rematrícula concluída.

## Regras de valores

- À vista (PIX ou cartão): `valor_promocional` de `rematricula_valores_2027` (se não houver promoção vigente, usa `valor_rematricula`).
- Parcelado no cartão: `valor_promocional_pacelado` (nome atual da coluna) como valor **total**, dividido em até 12x. Se essa coluna estiver vazia para o curso, a opção parcelada não é oferecida.
- Todos os valores são resolvidos no servidor — o front nunca envia preço.

## Detalhes técnicos

**Migration** em `alunos_rematricula_2027` (colunas novas, nada removido):
`asaas_customer_id`, `asaas_checkout_id`, `asaas_payment_id`, `checkout_url`, `checkout_criado_em`, `forma_pagamento`, `parcelas`, `valor_pago`, `data_pagamento`. `rematricula_concluida` já existe.

**RPCs** (SECURITY DEFINER, autenticadas por `id_aluno` + `data_nascimento_aluno`, mesmo padrão das existentes):
- `rematricula_2027_abrir` — passa a retornar também `rematricula_concluida`, `checkout_url`, `forma_pagamento`.
- `rematricula_2027_status` — retorna `contrato_assinado`, `rematricula_concluida`, `checkout_url`, e os valores disponíveis (à vista e parcelado) para a tela de escolha; usada no polling.

**Edge function nova `rematricula-2027-checkout`** (pública, `verify_jwt = false`):
- Valida body com Zod: `id_aluno`, `data_nascimento` (ISO), `forma_pagamento` (`pix` | `credit_card`), `parcelas` (1–12).
- Confere no banco que o aluno existe com aquela data de nascimento e que `contrato_assinado = true`; caso contrário, 403.
- Se já houver checkout válido (menos de 60 min) e não pago, reaproveita o link; se `rematricula_concluida`, retorna 409.
- Resolve o valor pela tabela de valores, cria/reaproveita o customer no Asaas (`getOrCreateCustomer` do `_shared/asaas.ts`, usando dados do responsável financeiro escolhido) e cria o checkout com `externalReference = "remat:<id_aluno>"`, `successUrl = /rematricula2027?pagamento=sucesso&aluno=<id>`.
- Grava checkout_id/url/forma/parcelas na linha do aluno.

**`asaas-webhook`**: novo ramo, antes dos ramos de ingressos/produtos, para `externalReference` começando com `remat:` — em evento pago (`PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `CHECKOUT_PAID`) grava `rematricula_concluida = true`, `data_pagamento`, `asaas_payment_id` e `valor_pago`; em estorno/chargeback volta para `false`. Idempotência e demais fluxos ficam inalterados. Usa a mesma URL e o mesmo `ASAAS_WEBHOOK_TOKEN` já cadastrados — nada novo a configurar no Asaas.

**Front**:
- Novo `src/components/rematricula/StepPagamento.tsx` com as três opções, select de parcelas e botão que chama a edge function e redireciona.
- `StepSucesso.tsx` passa a renderizar o bloco de pagamento (bloqueado/liberado/concluído) abaixo do contrato.
- `Rematricula2027.tsx`: polling leve de status, leitura do parâmetro `?pagamento=sucesso` e roteamento do aluno já concluído.

Nada do fluxo de eventos, produtos ou ZapSign é alterado.
