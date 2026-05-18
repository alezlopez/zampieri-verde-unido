ALTER TABLE public.ingressos
  ADD COLUMN IF NOT EXISTS taxa_manual numeric,
  ADD COLUMN IF NOT EXISTS taxa_manual_em timestamptz,
  ADD COLUMN IF NOT EXISTS taxa_manual_por uuid;

ALTER TABLE public.pedidos_produtos
  ADD COLUMN IF NOT EXISTS taxa_manual numeric,
  ADD COLUMN IF NOT EXISTS taxa_manual_em timestamptz,
  ADD COLUMN IF NOT EXISTS taxa_manual_por uuid;