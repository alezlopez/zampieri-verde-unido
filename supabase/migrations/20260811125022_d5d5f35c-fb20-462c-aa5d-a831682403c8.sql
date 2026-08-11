ALTER TABLE public.prematricula_otp
  ADD COLUMN IF NOT EXISTS canal text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS destino text;

UPDATE public.prematricula_otp SET destino = telefone WHERE destino IS NULL;

ALTER TABLE public.prematricula_otp ALTER COLUMN telefone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS prematricula_otp_canal_destino_idx
  ON public.prematricula_otp (canal, destino, created_at DESC);