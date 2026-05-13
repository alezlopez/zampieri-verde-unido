ALTER TABLE public.ingressos
  ADD COLUMN IF NOT EXISTS valor_bruto numeric,
  ADD COLUMN IF NOT EXISTS valor_liquido numeric,
  ADD COLUMN IF NOT EXISTS taxa_total numeric,
  ADD COLUMN IF NOT EXISTS data_pagamento timestamp with time zone,
  ADD COLUMN IF NOT EXISTS data_credito date;

CREATE INDEX IF NOT EXISTS idx_ingressos_data_pagamento ON public.ingressos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_ingressos_status_pago ON public.ingressos(status) WHERE status = 'pago';