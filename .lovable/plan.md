## Diagnóstico

**Causa raiz:** Na tabela `ingressos` (e idem em `pedidos_produtos`), `data_pagamento` está sendo gravada como **meia-noite UTC** do dia do pagamento (ex.: `2026-05-28 00:00:00+00`). Em BRT (UTC-3), isso equivale a `2026-05-27 21:00`. 

A função `resumo-diario-vendas` filtra "hoje" usando uma janela em UTC `[hoje 03:00 UTC, amanhã 02:59:59 UTC]` (que corresponde a 00:00–23:59 BRT). Como `data_pagamento` está em 00:00 UTC, ele cai **antes** da janela do dia atual em BRT — por isso aparece como dia anterior (ou não aparece) e o total do dia fica zerado.

**Múltiplos e-mails:** o cron está agendado corretamente 1×/dia (`0 23 * * *`). Os envios extras vieram dos testes manuais (curl). Não há bug de agendamento.

## Correção

Trocar a comparação por janela de timestamp por comparação **por data**:

1. Calcular `hojeBRT` como string `YYYY-MM-DD` (data BRT atual).
2. Para cada linha, extrair a data UTC de `data_pagamento` como `YYYY-MM-DD` (já que está em 00:00 UTC, equivale à data do pagamento).
3. Considerar "do dia" quando `dataPagamentoYMD === hojeBRT`.

Isso é aplicado tanto em `ingressos` quanto em `pedidos_produtos`.

### Trecho técnico

```ts
function hojeBRTymd(): string {
  const brt = new Date(Date.now() - 3 * 3600 * 1000);
  const y = brt.getUTCFullYear();
  const m = String(brt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(brt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
// ...
const hoje = hojeBRTymd();
const ymd = r.data_pagamento ? String(r.data_pagamento).slice(0, 10) : null;
if (ymd === hoje) somar(slot.dia, bruto, liquido);
```

O `label` do e-mail também passa a usar `hojeBRTymd()` para garantir consistência.

## Fora de escopo
- Não mudar como `data_pagamento` é gravado (decisão de negócio — é tratada como data de pagamento, não timestamp exato).
- Cron e template do e-mail permanecem iguais.
