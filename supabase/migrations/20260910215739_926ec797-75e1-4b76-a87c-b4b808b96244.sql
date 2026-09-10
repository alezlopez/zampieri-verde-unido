ALTER TABLE public.prematriculas
  ADD COLUMN IF NOT EXISTS motivo_codigo text,
  ADD COLUMN IF NOT EXISTS motivo_texto text,
  ADD COLUMN IF NOT EXISTS solucao_texto text,
  ADD COLUMN IF NOT EXISTS ressalva_documento text,
  ADD COLUMN IF NOT EXISTS ressalva_em timestamptz,
  ADD COLUMN IF NOT EXISTS reenviado_em timestamptz;

CREATE OR REPLACE FUNCTION public.validar_prematricula_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN (
    'pendente',
    'aprovado_aguardando_agendamento',
    'aprovado_com_ressalvas',
    'reenviado_aguardando_analise',
    'reprovado',
    'entrevista_agendada',
    'entrevista_concluida'
  ) THEN
    RAISE EXCEPTION 'status invalido: %', NEW.status;
  END IF;
  IF NEW.ressalva_documento IS NOT NULL AND NEW.ressalva_documento NOT IN ('boletim','laudo') THEN
    RAISE EXCEPTION 'ressalva_documento invalido: %', NEW.ressalva_documento;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_prematricula_status ON public.prematriculas;
CREATE TRIGGER trg_validar_prematricula_status
BEFORE INSERT OR UPDATE ON public.prematriculas
FOR EACH ROW EXECUTE FUNCTION public.validar_prematricula_status();