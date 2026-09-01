CREATE TABLE IF NOT EXISTS public.rematricula_2027_followup_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_aluno bigint NOT NULL REFERENCES public.alunos_rematricula_2027(id_aluno) ON DELETE CASCADE,
  etapa text NOT NULL,
  sequencia smallint NOT NULL,
  template text NOT NULL,
  destino text,
  sucesso boolean NOT NULL DEFAULT false,
  payload jsonb,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rematricula_2027_followup_envios_unq
  ON public.rematricula_2027_followup_envios (id_aluno, etapa, sequencia);
CREATE INDEX IF NOT EXISTS rematricula_2027_followup_envios_aluno_idx
  ON public.rematricula_2027_followup_envios (id_aluno);

GRANT SELECT ON public.rematricula_2027_followup_envios TO authenticated;
GRANT ALL ON public.rematricula_2027_followup_envios TO service_role;

ALTER TABLE public.rematricula_2027_followup_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff de rematricula le envios de followup"
ON public.rematricula_2027_followup_envios
FOR SELECT
TO authenticated
USING (public.has_setor(auth.uid(), 'rematricula'));

ALTER TABLE public.alunos_rematricula_2027
  ADD COLUMN IF NOT EXISTS followup_pausado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prazo_cancelamento_em timestamptz;