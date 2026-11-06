
ALTER TABLE public.evento_produtos
  ADD COLUMN IF NOT EXISTS variacoes_ids uuid[] NULL,
  ADD COLUMN IF NOT EXISTS nome_override text NULL,
  ADD COLUMN IF NOT EXISTS escassez_template text NULL;
