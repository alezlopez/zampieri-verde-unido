-- Normalização de nome (imutável, sem depender de unaccent)
CREATE OR REPLACE FUNCTION public.prematricula_norm_nome(p_nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(
    regexp_replace(
      translate(
        btrim(coalesce(p_nome, '')),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

ALTER TABLE public.prematriculas
  ADD COLUMN IF NOT EXISTS aluno_chave text
  GENERATED ALWAYS AS (public.prematricula_norm_nome(aluno_nome)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS prematriculas_aluno_unico
  ON public.prematriculas (aluno_chave, aluno_nascimento);

-- Códigos OTP do formulário de pré-matrícula
CREATE TABLE IF NOT EXISTS public.prematricula_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  codigo_hash text NOT NULL,
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  verificado_em timestamptz,
  consumido_em timestamptz,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prematricula_otp TO service_role;

ALTER TABLE public.prematricula_otp ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS prematricula_otp_telefone_idx
  ON public.prematricula_otp (telefone, created_at DESC);
