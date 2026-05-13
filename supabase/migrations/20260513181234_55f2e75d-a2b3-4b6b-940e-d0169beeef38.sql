-- Limpa os 15 ingressos do evento Aquário que foram contaminados
-- com o asaas_payment_id 'bbfddd93...' (que pertence a outro comprador).
-- Restaura valor_total para R$ 240 (inteira, à vista) e zera campos financeiros
-- para que o backfill possa reatribuir o pagamento Asaas correto de cada checkout.
UPDATE public.ingressos
SET
  asaas_payment_id = NULL,
  valor_bruto = NULL,
  valor_liquido = NULL,
  taxa_total = NULL,
  data_pagamento = NULL,
  data_credito = NULL,
  valor_total = 240,
  forma_pagamento = COALESCE(forma_pagamento, 'pix')
WHERE asaas_payment_id = 'bbfddd93-72d9-4430-99ae-f903a71da20a'
  AND id <> 'aa44c2aa-123e-4e65-93d6-e3db9d5e20b5';