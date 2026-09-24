ALTER TABLE public.alunos_rematricula_2027 ADD COLUMN IF NOT EXISTS turno_escolhido_em timestamptz;
UPDATE public.alunos_rematricula_2027 SET turno_escolhido_em = COALESCE(updated_at, now()) WHERE turno_escolhido IS NOT NULL AND turno_escolhido_em IS NULL;

CREATE OR REPLACE FUNCTION public.remat2027_turno_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.turno_escolhido IS DISTINCT FROM OLD.turno_escolhido THEN
    NEW.turno_escolhido_em := CASE WHEN NEW.turno_escolhido IS NULL THEN NULL ELSE now() END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_remat2027_turno_touch ON public.alunos_rematricula_2027;
CREATE TRIGGER trg_remat2027_turno_touch BEFORE UPDATE OF turno_escolhido ON public.alunos_rematricula_2027
FOR EACH ROW EXECUTE FUNCTION public.remat2027_turno_touch();

CREATE OR REPLACE FUNCTION public.rematricula_2027_liberar_vagas_expiradas() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
  WITH x AS (
    UPDATE public.alunos_rematricula_2027 SET turno_escolhido = NULL, updated_at = now()
    WHERE turno_escolhido IS NOT NULL
      AND turno_escolhido_em < now() - interval '24 hours'
      AND coalesce(contrato_gerado,false) = false
      AND coalesce(contrato_assinado,false) = false
      AND coalesce(rematricula_concluida,false) = false
      AND coalesce(cancelada,false) = false
      AND data_pagamento IS NULL
    RETURNING 1)
  SELECT count(*) INTO n FROM x;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.rematricula_2027_liberar_vagas_expiradas() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('rematricula-2027-liberar-vagas', '20 * * * *', $$SELECT public.rematricula_2027_liberar_vagas_expiradas();$$);