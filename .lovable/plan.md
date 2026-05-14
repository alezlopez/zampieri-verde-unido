
## Diagnóstico — causa raiz do erro reportado

```
null value in column "parcelas" of relation "ingressos" violates not-null constraint
```

Em `src/pages/EventoCompra.tsx`, na função de reserva (linhas 433–520), os ingressos são inseridos em **lote único** (`supabase.from("ingressos").insert(records)`), porém os objetos no array têm **shapes diferentes**:

- Registro do **comprador (comprar para si)** — linha 445: **não inclui `parcelas`**
- Registro de **aluno** — linha 474: inclui `parcelas: 1`
- Registro de **convidado** — linha 499: **não inclui `parcelas`**

O cliente supabase-js, em INSERT em lote, normaliza o conjunto de colunas pela união dos objetos. Para os registros que omitem `parcelas`, ele envia `NULL` no payload — e a coluna é `NOT NULL` (default 1 só vale se o campo for omitido em todas as linhas). Resultado: o INSERT falha quando há comprador-self ou convidados misturados com alunos.

O mesmo padrão também causa risco em `forma_pagamento` (linha 489 usa `undefined`/`null` apenas no aluno cortesia) e quaisquer outras colunas presentes em só parte dos registros.

## Plano

### 1. Corrigir o bug de `parcelas` NULL (P0)

Em `EventoCompra.tsx`, padronizar a forma dos registros antes do `insert`. Estratégia: construir cada registro a partir de um objeto base com **todas as colunas** que qualquer linha possa precisar (com defaults seguros), e depois sobrescrever o que difere:

- Base: `{ parcelas: 1, forma_pagamento: null, codigo_aluno: null, cpf_participante: null, data_nascimento_participante: null, email_participante: null, celular_participante: null, categoria_meia: null, declaracao_meia_aceita: false, declaracao_meia_aceita_em: null, cortesia: false, ... }`
- Garantir que **todos** os 3 ramos (comprador-self, aluno, convidado) compartilhem exatamente as mesmas chaves.

### 2. Blindagem de banco (P1)

Como rede de segurança contra futuros bugs equivalentes, manter os defaults atuais e adicionar `COALESCE` defensivo em código (não migrar `parcelas` para nullable — manter integridade). Sem alterações de schema.

### 3. Toasts amigáveis nos fluxos de checkout (P1)

Centralizar a tradução de erros conhecidos em uma helper `friendlyCheckoutError(err)` e usar nos pontos de falha:

- `EventoCompra.tsx` (reserva + invoke `asaas-create-checkout`)
- `Produtos.tsx` (invoke `produtos-create-checkout`)
- `MeusIngressos.tsx` (re-tentativa de checkout)

Mapeamentos:

| Erro técnico | Mensagem amigável |
|---|---|
| `parcelas`/`not-null constraint` | "Não foi possível concluir a reserva. Tente novamente — se persistir, contate o suporte." |
| `cota_meia_esgotada` | "Cota de meia-entrada esgotada para este evento." |
| `Vagas insuficientes` | (já existe, manter) |
| `Comprador sem CPF/nome` | "Complete seu cadastro (CPF e nome) antes de comprar." |
| `Ingressos de eventos diferentes` | "Os ingressos selecionados são de eventos diferentes." |
| Falha de rede / 5xx | "Falha temporária ao gerar a cobrança. Tente novamente em instantes." |
| Genérico | "Não foi possível processar sua compra. Tente novamente." |

Sempre acompanhar o toast de erro com orientação prática (ex.: "Acesse 'Meus Ingressos' para retomar o pagamento.") quando aplicável.

### 4. Remoção de código legado / não usado (P2 — conservador)

Varrer e remover apenas o que tiver **zero referências**:

- `webhook_payment_id` na tabela `ingressos` é gravado? Verificar uso. Se obsoleto frente a `asaas_payment_id`, marcar para depreciação (sem dropar coluna agora — apenas parar de gravar).
- Conferir edge functions órfãs (sem callers no frontend nem cron):
  - `backfill-produtos-financeiro` — se tem botão na admin, manter; senão depreciar.
  - `relatorio-vendas` vs `relatorio-produtos` — checar callers.
- Imports não usados nos arquivos tocados.

Nada será removido sem confirmar com `rg` que não há referência viva.

### 5. Validação

- Testar 3 cenários no preview: (a) só comprador-self, (b) só alunos, (c) comprador + alunos + convidados misturados — todos devem inserir sem erro.
- Verificar logs de `asaas-create-checkout` após reserva.
- Confirmar que toast amigável aparece quando o checkout retorna erro forçado.

## Arquivos afetados

- `src/pages/EventoCompra.tsx` — uniformizar shape dos records + toasts amigáveis
- `src/pages/Produtos.tsx` — toasts amigáveis
- `src/pages/MeusIngressos.tsx` — toasts amigáveis no retry
- `src/lib/checkoutErrors.ts` (novo) — helper `friendlyCheckoutError`
- (Opcional, depois de auditoria viva) limpeza de imports/funcs não usadas

## O que NÃO será feito

- Nenhuma migração de schema (defaults já corretos; o problema é cliente).
- Nenhuma mudança em RLS, webhook, ou lógica financeira.
- Nada será deletado sem confirmação textual de "zero referências".
