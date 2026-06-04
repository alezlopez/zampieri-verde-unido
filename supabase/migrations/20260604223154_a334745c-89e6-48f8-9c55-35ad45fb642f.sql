ALTER TABLE public.evento_produtos
ADD COLUMN IF NOT EXISTS nomes_override_variacoes jsonb;