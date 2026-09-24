DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.rematricula_2027_salvar'::regproc);
  d := replace(d,
'    SELECT COUNT(*)::integer INTO v_ocupadas
    FROM public.alunos_rematricula_2027 a
    WHERE a.curso_2027 = v_aluno.curso_2027
      AND lower(trim(a.turno_escolhido)) = lower(v_turno);',
'    SELECT COALESCE(SUM(oc.remat + oc.matr), 0)::integer INTO v_ocupadas
    FROM public.vagas_2027_ocupacao() oc
    WHERE oc.curso_2027 = v_aluno.curso_2027
      AND oc.turno = public.norm_turno(v_turno);');
  IF position('vagas_2027_ocupacao' in d) = 0 THEN
    RAISE EXCEPTION 'bloco de contagem não encontrado';
  END IF;
  EXECUTE d;
END $$;