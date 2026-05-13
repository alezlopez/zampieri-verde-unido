
-- ============================================================
-- 1) LIMPEZA DE CONTAMINAÇÃO: asaas_payment_id b1583e04...
-- ============================================================
-- Limpa apenas o vínculo asaas_payment_id (mantém valores e status pago)
UPDATE public.ingressos
SET asaas_payment_id = NULL
WHERE asaas_payment_id = 'b1583e04-bc0e-4685-8111-6ba9feb2c447';

-- ============================================================
-- 2) PREENCHE valor_total dos 38 ingressos pagos com valor_total=0
-- ============================================================
UPDATE public.ingressos
SET valor_total = valor_bruto
WHERE status = 'pago'
  AND cortesia = false
  AND COALESCE(valor_total, 0) = 0
  AND valor_bruto IS NOT NULL
  AND valor_bruto > 0;

-- ============================================================
-- 3) CHECK CONSTRAINTS em status
-- ============================================================
ALTER TABLE public.ingressos
  DROP CONSTRAINT IF EXISTS ingressos_status_check;
ALTER TABLE public.ingressos
  ADD CONSTRAINT ingressos_status_check
  CHECK (status IN ('pendente','pago','cancelado','estornado'));

ALTER TABLE public.pedidos_produtos
  DROP CONSTRAINT IF EXISTS pedidos_produtos_status_check;
ALTER TABLE public.pedidos_produtos
  ADD CONSTRAINT pedidos_produtos_status_check
  CHECK (status IN ('pendente','pago','cancelado','estornado'));

-- ============================================================
-- 4) valor_total em ingressos: NOT NULL DEFAULT 0
-- ============================================================
UPDATE public.ingressos SET valor_total = 0 WHERE valor_total IS NULL;
ALTER TABLE public.ingressos
  ALTER COLUMN valor_total SET DEFAULT 0,
  ALTER COLUMN valor_total SET NOT NULL;

-- ============================================================
-- 5) UNIQUE (evento_id, produto_id) em evento_produtos
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS evento_produtos_evento_produto_uniq
  ON public.evento_produtos (evento_id, produto_id);

-- ============================================================
-- 6) UNIQUE (cpf) em compradores_externos
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS compradores_externos_cpf_uniq
  ON public.compradores_externos (cpf);

-- ============================================================
-- 7) Purge automático de asaas_webhook_events > 90 dias
-- ============================================================
CREATE OR REPLACE FUNCTION public.purgar_asaas_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.asaas_webhook_events
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Agenda diária às 3h via pg_cron (se já existir, recria)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purgar-asaas-webhook-events')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purgar-asaas-webhook-events');
    PERFORM cron.schedule(
      'purgar-asaas-webhook-events',
      '0 3 * * *',
      $cron$ SELECT public.purgar_asaas_webhook_events(); $cron$
    );
  END IF;
END $$;

-- ============================================================
-- 8) Índices úteis para debug e performance
-- ============================================================
CREATE INDEX IF NOT EXISTS ingressos_checkout_id_idx ON public.ingressos (checkout_id);
CREATE INDEX IF NOT EXISTS ingressos_asaas_payment_id_idx ON public.ingressos (asaas_payment_id);
CREATE INDEX IF NOT EXISTS pedidos_produtos_checkout_id_idx ON public.pedidos_produtos (checkout_id);
CREATE INDEX IF NOT EXISTS pedidos_produtos_asaas_payment_id_idx ON public.pedidos_produtos (asaas_payment_id);
