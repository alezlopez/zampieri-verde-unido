DROP FUNCTION IF EXISTS public.rematricula_2027_valor_vigente(text);

CREATE FUNCTION public.rematricula_2027_valor_vigente(p_curso text)
RETURNS TABLE(valor_avista numeric, valor_parcelado numeric, valor_cheio numeric, fase integer, fase_fim date, fase_inicio date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_fase_id uuid;
  v_fase integer;
  v_fim date;
  v_inicio date;
  v_cheio numeric;
BEGIN
  SELECT v.valor_rematricula INTO v_cheio
  FROM public.rematricula_valores_2027 v
  WHERE v.curso_2027 = p_curso AND v.ativo = true
  LIMIT 1;

  SELECT f.id, f.fase, f.fim, f.inicio INTO v_fase_id, v_fase, v_fim, v_inicio
  FROM public.rematricula_2027_fases f
  WHERE f.ativo = true
    AND f.inicio <= v_hoje
    AND (f.fim IS NULL OR f.fim >= v_hoje)
  ORDER BY f.inicio DESC
  LIMIT 1;

  IF v_fase_id IS NULL THEN
    SELECT f.id, f.fase, f.inicio INTO v_fase_id, v_fase, v_inicio
    FROM public.rematricula_2027_fases f
    WHERE f.ativo = true AND f.inicio <= v_hoje
    ORDER BY f.inicio DESC
    LIMIT 1;
    v_fim := NULL;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(fv.valor_avista, v_cheio, 0)::numeric,
    COALESCE(fv.valor_parcelado, v_cheio, 0)::numeric,
    COALESCE(v_cheio, 0)::numeric,
    v_fase,
    v_fim,
    v_inicio
  FROM (SELECT 1) x
  LEFT JOIN public.rematricula_2027_fase_valores fv
    ON fv.fase_id = v_fase_id AND fv.curso_2027 = p_curso;
END;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_valor_vigente(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_valor_vigente(text) TO anon, authenticated, service_role;