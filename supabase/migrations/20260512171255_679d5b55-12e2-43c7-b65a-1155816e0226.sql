
ALTER TABLE public.ingressos
  ADD COLUMN IF NOT EXISTS utilizado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS utilizado_por uuid,
  ADD COLUMN IF NOT EXISTS email_confirmacao_enviado_em timestamp with time zone;
