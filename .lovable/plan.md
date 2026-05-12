## Objetivo

Permitir que eventos do tipo "alunos + convidados" tenham uma configuração que marca o ingresso do **aluno como cortesia** (gratuito). Nesse caso:
- O ingresso do aluno é criado já como **pago** (cortesia), sem valor.
- O ingresso do aluno **não entra** no checkout do Asaas.
- Convidados (e o próprio comprador, se marcado) continuam pagando normalmente.

## Mudanças

### 1. Banco de dados (migração)

**Tabela `eventos`** — novo campo:
- `aluno_cortesia` boolean NOT NULL DEFAULT false — quando true, ingressos do tipo aluno deste evento são cortesia.

**Tabela `ingressos`** — novo campo (para auditoria e exibição):
- `cortesia` boolean NOT NULL DEFAULT false — marca o ingresso individual como cortesia.

Nenhum dado existente é alterado, apenas defaults para novos registros — exatamente o que você pediu.

### 2. Painel admin (`src/pages/EventosAdmin.tsx`)

No formulário de criar/editar evento, adicionar um switch:
- **"Aluno é cortesia (não paga)"** — só aparece/é aplicável quando o evento permite alunos (tipo `apenas_alunos` ou `alunos_e_convidados`).
- Texto auxiliar: "O ingresso do aluno será emitido automaticamente como pago, sem cobrança. Convidados continuam pagando."

### 3. Fluxo de compra (`src/pages/EventoCompra.tsx`)

Ao montar o carrinho:

- Para cada aluno selecionado, se `evento.aluno_cortesia === true`:
  - Criar o ingresso com `status: "pago"`, `cortesia: true`, `valor_total: 0`, `tipo_ingresso: "inteira"`, `forma_pagamento: null`, `parcelas: 1`.
  - **Não incluir** o id desse ingresso na chamada `asaas-create-checkout`.
  - Não exibir esse participante no bloco de meia-entrada (cortesia não tem meia).
- Convidados e comprador-self continuam no fluxo normal (entram no Asaas).

UI:
- Mostrar tag "Cortesia" ao lado do nome do aluno na lista de participantes.
- No resumo de valores, exibir "Aluno (cortesia): R$ 0,00" e somar apenas convidados/comprador no total.
- Se **só houver alunos cortesia** (nenhum convidado, comprador não marcado): pular o checkout completamente, mostrar tela de sucesso e redirecionar para `/eventos/meus-ingressos`.

### 4. Edge function (`supabase/functions/asaas-create-checkout/index.ts`)

Defesa adicional no servidor:
- Filtrar `ingresso_ids` recebidos, ignorando qualquer ingresso com `cortesia = true` ou `status = 'pago'`.
- Se após o filtro a lista ficar vazia, retornar 400 "Nenhum ingresso elegível para cobrança" (não deveria acontecer se o frontend estiver correto).

### 5. Exibição (`src/pages/MeusIngressos.tsx` e `IngressoDetalhe.tsx`)

- Mostrar badge "Cortesia" quando `cortesia === true`.
- Não mostrar botão "Pagar" para ingressos cortesia (já estão como `pago`).

### 6. Admin de vendas (`EventosAdmin.tsx`, dashboard de valores recebidos)

- Cortesias não somam em "Recebido" nem "Pendente" — ficam em uma linha separada "Cortesias emitidas (qtd)".

## Considerações

- Não mexe em ingressos já vendidos.
- Não altera webhook nem sync — cortesia já nasce paga.
- Função `contar_meias_evento` não é afetada (cortesia é sempre inteira).
- Estorno não se aplica a cortesia (sem cobrança no Asaas).

Posso seguir?
