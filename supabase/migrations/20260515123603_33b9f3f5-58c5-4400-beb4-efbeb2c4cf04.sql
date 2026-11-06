UPDATE public.ingressos SET
  forma_pagamento = 'credit_card',
  parcelas = 1,
  valor_total  = 240.00,
  valor_bruto  = 240.00,
  taxa_total   = 4.53,
  valor_liquido = 235.47,
  data_pagamento = '2026-05-12T15:00:00+00'::timestamptz,
  data_credito   = '2026-05-12'::date
WHERE id = 'e3117492-0dbe-40b8-ad0b-63ed39b34ef2';