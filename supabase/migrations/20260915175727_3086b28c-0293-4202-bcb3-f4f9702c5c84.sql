-- 1) Novas colunas no controle de vagas
ALTER TABLE public.vagas_2027
  ADD COLUMN IF NOT EXISTS matricula_habilitada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vagas_novos integer NOT NULL DEFAULT 0;

-- 2) Normalização de turno
CREATE OR REPLACE FUNCTION public.norm_turno(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT lower(trim(translate(coalesce(_t, ''), 'ãáâàéêíóôõúüç', 'aaaaeeioooutc')));
$$;

-- 3) Mapeamento série da pré-matrícula -> curso do controle de vagas
CREATE OR REPLACE FUNCTION public.curso_2027_por_serie(_serie text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(trim(coalesce(_serie, '')))
    WHEN 'infantil 5 (pré-escola)' THEN 'Educação Infantil - Pré'
    WHEN 'infantil 5 (pre-escola)' THEN 'Educação Infantil - Pré'
    WHEN '1º ano' THEN 'Ensino Fundamental I - 1º Ano'
    WHEN '2º ano' THEN 'Ensino Fundamental I - 2º Ano'
    WHEN '3º ano' THEN 'Ensino Fundamental I - 3º Ano'
    WHEN '4º ano' THEN 'Ensino Fundamental I - 4º Ano'
    WHEN '5º ano' THEN 'Ensino Fundamental I - 5º Ano'
    WHEN '6º ano' THEN 'Ensino Fundamental II - 6º Ano'
    WHEN '7º ano' THEN 'Ensino Fundamental II - 7º Ano'
    WHEN '8º ano' THEN 'Ensino Fundamental II - 8º Ano'
    WHEN '9º ano' THEN 'Ensino Fundamental II - 9º Ano'
    WHEN '1ª série do ensino médio' THEN 'Ensino Médio - 1º Ano'
    WHEN '2ª série do ensino médio' THEN 'Ensino Médio - 2º Ano'
    WHEN '3ª série do ensino médio' THEN 'Ensino Médio - 3º Ano'
    ELSE NULL
  END;
$$;

-- 4) Ocupação consolidada (rematrícula + matrícula de alunos novos)
CREATE OR REPLACE FUNCTION public.vagas_2027_ocupacao()
RETURNS TABLE(curso_2027 text, turno text, remat integer, matr integer)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH r AS (
    SELECT a.curso_2027 AS curso, public.norm_turno(a.turno_escolhido) AS turno, COUNT(*)::integer AS qtd
    FROM public.alunos_rematricula_2027 a
    WHERE coalesce(a.cancelada, false) = false
      AND coalesce(trim(a.turno_escolhido), '') <> ''
    GROUP BY 1, 2
  ),
  m AS (
    SELECT public.curso_2027_por_serie(mt.curso) AS curso, public.norm_turno(mt.turno) AS turno, COUNT(*)::integer AS qtd
    FROM public.matriculas mt
    WHERE coalesce(mt.acompanhamento, 'ativo') NOT IN ('cancelado', 'desistente')
      AND public.curso_2027_por_serie(mt.curso) IS NOT NULL
      AND coalesce(trim(mt.turno), '') <> ''
    GROUP BY 1, 2
  )
  SELECT
    coalesce(r.curso, m.curso),
    coalesce(r.turno, m.turno),
    coalesce(r.qtd, 0),
    coalesce(m.qtd, 0)
  FROM r
  FULL OUTER JOIN m ON m.curso = r.curso AND m.turno = r.turno;
$$;

REVOKE ALL ON FUNCTION public.vagas_2027_ocupacao() FROM public;
GRANT EXECUTE ON FUNCTION public.vagas_2027_ocupacao() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.norm_turno(text) FROM public;
GRANT EXECUTE ON FUNCTION public.norm_turno(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.curso_2027_por_serie(text) FROM public;
GRANT EXECUTE ON FUNCTION public.curso_2027_por_serie(text) TO anon, authenticated, service_role;

-- 5) Turnos da rematrícula (prioridade: rematrícula usa o total da turma)
CREATE OR REPLACE FUNCTION public.rematricula_2027_turnos(p_curso_2027 text)
RETURNS TABLE(turno text, max_vagas integer, ocupadas integer, disponiveis integer, disponivel boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    vt.turno,
    vt.max_vagas,
    (coalesce(oc.remat, 0) + coalesce(oc.matr, 0))::integer,
    GREATEST(vt.max_vagas - coalesce(oc.remat, 0) - coalesce(oc.matr, 0), 0)::integer,
    (vt.max_vagas - coalesce(oc.remat, 0) - coalesce(oc.matr, 0)) > 0
  FROM public.vagas_2027 vt
  LEFT JOIN public.vagas_2027_ocupacao() oc
    ON oc.curso_2027 = vt.curso_2027 AND oc.turno = public.norm_turno(vt.turno)
  WHERE vt.ativo = true
    AND vt.curso_2027 = p_curso_2027
  ORDER BY vt.turno;
END;
$function$;

REVOKE ALL ON FUNCTION public.rematricula_2027_turnos(text) FROM public;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_turnos(text) TO anon, authenticated, service_role;

-- 6) Painel admin de vagas
DROP FUNCTION IF EXISTS public.rematricula_2027_admin_vagas();
CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_vagas()
RETURNS TABLE(
  id uuid,
  curso_2027 text,
  turno text,
  max_vagas integer,
  ativo boolean,
  matricula_habilitada boolean,
  vagas_novos integer,
  ocupadas_rematricula integer,
  ocupadas_matricula integer,
  ocupadas integer,
  disponiveis integer,
  disponiveis_novos integer,
  lista_espera integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_setor(auth.uid(), 'rematricula') OR public.has_setor(auth.uid(), 'matricula')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    vt.id,
    vt.curso_2027,
    vt.turno,
    vt.max_vagas,
    vt.ativo,
    vt.matricula_habilitada,
    vt.vagas_novos,
    coalesce(oc.remat, 0)::integer,
    coalesce(oc.matr, 0)::integer,
    (coalesce(oc.remat, 0) + coalesce(oc.matr, 0))::integer,
    GREATEST(vt.max_vagas - coalesce(oc.remat, 0) - coalesce(oc.matr, 0), 0)::integer,
    LEAST(
      GREATEST(vt.vagas_novos - coalesce(oc.matr, 0), 0),
      GREATEST(vt.max_vagas - coalesce(oc.remat, 0) - coalesce(oc.matr, 0), 0)
    )::integer,
    coalesce(le.qtd, 0)::integer
  FROM public.vagas_2027 vt
  LEFT JOIN public.vagas_2027_ocupacao() oc
    ON oc.curso_2027 = vt.curso_2027 AND oc.turno = public.norm_turno(vt.turno)
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS qtd
    FROM public.lista_espera_2027 l
    WHERE l.curso_2027 = vt.curso_2027
      AND public.norm_turno(l.turno) = public.norm_turno(vt.turno)
      AND l.status = 'aguardando'
  ) le ON true
  ORDER BY vt.curso_2027, vt.turno;
END;
$function$;

REVOKE ALL ON FUNCTION public.rematricula_2027_admin_vagas() FROM public;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_vagas() TO authenticated, service_role;
