CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_fase_excecao(p_id_aluno bigint, p_fase integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aluno public.alunos_rematricula_2027%ROWTYPE;
  v_anterior text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;

  SELECT * INTO v_aluno FROM public.alunos_rematricula_2027 WHERE id_aluno = p_id_aluno;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'aluno_nao_encontrado');
  END IF;

  IF COALESCE(v_aluno.contrato_assinado, false)
     OR COALESCE(v_aluno.rematricula_concluida, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'processo_em_andamento');
  END IF;

  IF p_fase IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rematricula_2027_fases f WHERE f.fase = p_fase
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fase_invalida');
  END IF;

  v_anterior := v_aluno.fase_excecao::text;

  IF v_anterior IS DISTINCT FROM p_fase::text THEN
    INSERT INTO public.rematricula_2027_alteracoes (id_aluno, campo, valor_anterior, valor_novo)
    VALUES (p_id_aluno, 'fase_excecao', v_anterior, p_fase::text);
  END IF;

  UPDATE public.alunos_rematricula_2027
     SET fase_excecao = p_fase::smallint,
         asaas_payment_id = NULL,
         asaas_checkout_id = NULL,
         checkout_url = NULL,
         checkout_criado_em = NULL,
         updated_at = now()
   WHERE id_aluno = p_id_aluno;

  RETURN jsonb_build_object('ok', true, 'fase', p_fase);
END;
$function$;