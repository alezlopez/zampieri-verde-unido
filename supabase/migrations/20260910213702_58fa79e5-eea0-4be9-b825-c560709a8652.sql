ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS conferida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conferida_em timestamptz,
  ADD COLUMN IF NOT EXISTS conferida_por uuid,
  ADD COLUMN IF NOT EXISTS acompanhamento text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS acompanhamento_motivo text,
  ADD COLUMN IF NOT EXISTS acompanhamento_em timestamptz,
  ADD COLUMN IF NOT EXISTS acompanhamento_por uuid;

ALTER TABLE public.prematriculas
  ADD COLUMN IF NOT EXISTS acompanhamento text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS acompanhamento_motivo text,
  ADD COLUMN IF NOT EXISTS acompanhamento_em timestamptz,
  ADD COLUMN IF NOT EXISTS acompanhamento_por uuid;

CREATE OR REPLACE FUNCTION public.validar_acompanhamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.acompanhamento IS NULL OR NEW.acompanhamento NOT IN ('ativo','desistente','cancelado') THEN
    RAISE EXCEPTION 'acompanhamento invalido: %', NEW.acompanhamento;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_acompanhamento_matriculas ON public.matriculas;
CREATE TRIGGER validar_acompanhamento_matriculas
  BEFORE INSERT OR UPDATE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.validar_acompanhamento();

DROP TRIGGER IF EXISTS validar_acompanhamento_prematriculas ON public.prematriculas;
CREATE TRIGGER validar_acompanhamento_prematriculas
  BEFORE INSERT OR UPDATE ON public.prematriculas
  FOR EACH ROW EXECUTE FUNCTION public.validar_acompanhamento();