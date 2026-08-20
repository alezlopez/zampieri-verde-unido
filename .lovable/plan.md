# Portal de renegociação (/renegociacao)

Alunos com `rematricula_liberada = false` são devedores. Hoje eles só veem um aviso para procurar a secretaria. Passam a ser levados ao portal de renegociação, onde escolhem quais mensalidades pagar e pagam pelo Asaas. Quando **todos** os débitos do aluno estiverem pagos, a rematrícula é liberada automaticamente.

Situação atual verificada no banco: 199 linhas em `devedores_2027`, 65 alunos distintos, todos com correspondência em `alunos_rematricula_2027`, e exatamente 65 alunos com `rematricula_liberada` diferente de true. A tabela de débitos ainda não tem nenhuma coluna de status de pagamento.

## Experiência do responsável

```text
/rematricula2027 -> busca CPF/telefone -> seleciona aluno
   |-- liberado      -> fluxo de rematrícula (inalterado)
   |-- NÃO liberado  -> tela de aviso com botão "Regularizar débitos" -> /renegociacao
```

Em `/renegociacao`:
1. Busca por CPF/telefone e seleção do aluno (mesmo componente da rematrícula).
2. Confirmação por código (OTP) no WhatsApp ou e-mail — mesma verificação já usada hoje.
3. Lista dos débitos em aberto: mês/vencimento, valor principal, juros, multa e o total à vista de cada linha. Linhas já pagas aparecem marcadas e não selecionáveis.
4. O responsável marca as parcelas que quer pagar (por padrão todas). O rodapé mostra o total à vista e o total parcelado.
5. Escolha da forma de pagamento: PIX à vista, cartão à vista (ambos somam `valor_a_vista`) ou cartão parcelado em até 12x (soma `valor_parcelado`).
6. Redirecionamento ao checkout Asaas. Ao voltar, a tela mostra "pagamento em processamento" e atualiza sozinha.
7. Após a confirmação: se ainda restarem débitos, a tela mostra o saldo restante e o botão para pagar o resto. Se o saldo zerou, aparece "Débitos quitados — rematrícula liberada" com botão direto para `/rematricula2027`.

**Regra central:** pagamento parcial nunca libera a rematrícula. `rematricula_liberada` só vira true quando não sobrar nenhuma linha em aberto do aluno.

## Painel administrativo

Nova aba "Renegociação" dentro da área de rematrícula (`/rematricula2027/renegociacao`, acesso setor `rematricula`), listando por aluno: total devido, total pago, saldo, situação (em aberto / parcial / quitado), forma de pagamento e data. Permite conferir cada pagamento, ver as linhas quitadas e, se necessário, marcar/desmarcar uma linha manualmente (com registro de quem fez) — desmarcar reverte `rematricula_liberada` para false.

## Detalhes técnicos

**Migration em `devedores_2027`** (colunas novas, nada removido): `pago boolean not null default false`, `pago_em timestamptz`, `asaas_payment_id text`, `asaas_checkout_id text`, `forma_pagamento text`, `valor_pago numeric`, `baixa_manual_por uuid`, `baixa_manual_em timestamptz`. `row_id` vira a chave usada para selecionar as parcelas. Índice em `id_aluno`. Sem acesso `anon`/`authenticated` — tudo passa por RPC/edge function `SECURITY DEFINER`, como no restante do fluxo 2027.

**Nova tabela `renegociacao_2027_checkouts`**: `id`, `id_aluno`, `row_ids bigint[]`, `valor_total`, `forma_pagamento`, `parcelas`, `asaas_checkout_id`, `asaas_payment_id`, `checkout_url`, `status` (`pendente`/`pago`/`cancelado`), timestamps. É o que permite ao webhook saber exatamente quais linhas quitar. GRANTs só para `service_role`.

**RPCs novas** (SECURITY DEFINER, mesmo padrão de autenticação por `id_aluno` + data de nascimento):
- `renegociacao_2027_debitos` — retorna as linhas do aluno com status e os totais (aberto/pago/saldo).
- `renegociacao_2027_status` — usada no polling pós-checkout.
- `renegociacao_2027_admin_listagem` e `renegociacao_2027_admin_baixa` — para o painel, exigindo `has_setor('rematricula')`.
- Função `renegociacao_2027_recalcular_liberacao(id_aluno)` — define `rematricula_liberada = (nenhuma linha em aberto)`; chamada após cada baixa, automática ou manual.

**Edge function nova `renegociacao-2027-checkout`** (`verify_jwt = false`): valida com Zod `id_aluno`, `data_nascimento`, `row_ids[]`, `forma_pagamento` (`pix`/`credit_card`), `parcelas` (1–12). Confere o aluno pela data de nascimento, recalcula o valor **no servidor** a partir das linhas escolhidas (à vista ou parcelado conforme a forma), reaproveita checkout válido de menos de 60 min com a mesma seleção, cria o customer com `getOrCreateCustomer` e o checkout com `externalReference = "reneg:<checkout_id>"`. `successUrl` volta para `/renegociacao?pagamento=sucesso&aluno=<id>`.

**`asaas-webhook`**: novo ramo para `externalReference` iniciado em `reneg:` — em evento pago marca as linhas do registro como `pago`, grava `valor_pago`/`data`/`payment_id` e chama o recálculo de liberação; em estorno/chargeback reverte as linhas e volta `rematricula_liberada` para false. Ramos de ingressos, produtos, rematrícula e matrícula ficam intactos.

**OTP**: reaproveita `rematricula-2027-otp-enviar` / `-validar` acrescentando a finalidade `renegociacao`, que ignora a checagem de `rematricula_liberada` (hoje ela bloqueia justamente esses alunos) e continua respeitando o rate limit por IP.

**Frontend**: nova página `src/pages/Renegociacao.tsx` + componentes em `src/components/renegociacao/` (`StepDebitos`, `StepPagamentoDebitos`, `StepQuitado`), reutilizando `StepBusca`, `StepCanal` e `StepCodigo` da rematrícula. Rota `/renegociacao` em `App.tsx`. Em `Rematricula2027.tsx`, a fase `bloqueado` ganha o botão "Regularizar débitos" apontando para `/renegociacao`, mantendo o contato da secretaria.
