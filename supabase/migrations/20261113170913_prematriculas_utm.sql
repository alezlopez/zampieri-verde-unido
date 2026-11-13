-- Campanha de origem (UTMs) de cada pré-matrícula, para cruzar anúncio com matrícula efetivada.
ALTER TABLE public.prematriculas
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text;
