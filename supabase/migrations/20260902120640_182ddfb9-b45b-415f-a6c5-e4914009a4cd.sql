CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_vagas()
RETURNS TABLE (
  id uuid,
  curso_2027 text,
  turno text,
  max_vagas integer,
  ativo boolean,
  ocupadas integer,
  disponiveis integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    vt.id,
    vt.curso_2027,
    vt.turno,
    vt.max_vagas,
    vt.ativo,
    COALESCE(oc.qtd, 0)::integer,
    GREATEST(vt.max_vagas - COALESCE(oc.qtd, 0), 0)::integer
  FROM public.vagas_2027 vt
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS qtd
    FROM public.alunos_rematricula_2027 a
    WHERE a.curso_2027 = vt.curso_2027
      AND lower(trim(a.turno_escolhido)) = lower(trim(vt.turno))
  ) oc ON true
  ORDER BY vt.curso_2027, vt.turno;
END;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_admin_vagas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_vagas() TO authenticated;