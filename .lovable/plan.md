## Execução aprovada

### 1. Backfill do ingresso `e3117492…`
Migration com UPDATE:
```sql
UPDATE ingressos SET
  forma_pagamento = 'credit_card',
  parcelas = 1,
  valor_total  = 240.00,
  valor_bruto  = 240.00,
  taxa_total   = 4.53,
  valor_liquido = 235.47,
  data_pagamento = '2026-05-12T12:00:00-03:00',
  data_credito   = '2026-05-12'
WHERE id = 'e3117492-0dbe-40b8-ad0b-63ed39b34ef2';
```

### 2. Inserção manual com dados financeiros (`src/pages/EventosAdmin.tsx`)
Adicionar ao formulário "Novo ingresso manual":
- **Forma de pagamento**: select `pix | credit_card | dinheiro | outro` (default `dinheiro`)
- **Parcelas** (visível só para `credit_card`): 1–12, default 1
- **Valor por participante (R$)**: número, default = `evento.preco`
- **Taxa total do lote (R$)**: opcional, default 0 (rateada proporcional ao valor de cada participante)
- **Data do pagamento**: date, default = hoje

No `handleSaveManual`, montar cada record com:
```ts
{
  ...campos atuais,
  status: "pago",
  forma_pagamento,
  parcelas: forma_pagamento === "credit_card" ? parcelas : 1,
  valor_total: valorParticipante,
  valor_bruto: valorParticipante,
  taxa_total: taxaParticipante,
  valor_liquido: +(valorParticipante - taxaParticipante).toFixed(2),
  data_pagamento: new Date(`${dataPagto}T12:00:00`).toISOString(),
  data_credito: dataPagto,
}
```
Resetar os novos campos no `resetManualForm`.

### 3. Limpeza de obsoletos
Deletar:
- `src/components/FloatingChat.tsx`
- `src/components/ChatWindow.tsx`
- `src/components/ContactForm.tsx`
- `src/components/FloatingCTA.tsx`
- `src/components/WhatsAppCTA.tsx`
- `src/utils/messageFormatter.ts`

### 4. Atualizar memória
Atualizar `mem://features/chat-system` e o índice para refletir que o chat foi removido (não apenas desativado).

---
Posso prosseguir.