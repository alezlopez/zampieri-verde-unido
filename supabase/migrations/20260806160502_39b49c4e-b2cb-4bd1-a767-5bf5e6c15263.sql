ALTER TABLE public.prematriculas ADD COLUMN IF NOT EXISTS token text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prematriculas_token_unico ON public.prematriculas(token);
ALTER TABLE public.prematriculas ALTER COLUMN token_hash DROP NOT NULL;