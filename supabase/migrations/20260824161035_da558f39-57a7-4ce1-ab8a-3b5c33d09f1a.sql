ALTER TABLE public.alunos_rematricula_2027
  ADD COLUMN IF NOT EXISTS cancelada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS estorno_valor numeric,
  ADD COLUMN IF NOT EXISTS estorno_em timestamptz;