-- Cancelamento de visitas pela secretaria, com registro do aviso à família.
ALTER TABLE public.visitas
  ADD COLUMN cancelada_em timestamptz,
  ADD COLUMN cancelada_por uuid,
  ADD COLUMN motivo_cancelamento text,
  ADD COLUMN aviso_enviado_em timestamptz;
