ALTER TABLE public.alunos_rematricula_2027
  ADD COLUMN IF NOT EXISTS fase_excecao smallint;

-- Valor vigente: aceita fase forçada (exceção por aluno)
CREATE OR REPLACE FUNCTION public.rematricula_2027_valor_vigente(p_curso text, p_fase integer DEFAULT NULL)
 RETURNS TABLE(valor_avista numeric, valor_parcelado numeric, valor_cheio numeric, fase integer, fase_fim date, fase_inicio date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF p_fase IS NOT NULL THEN
    SELECT f.id, f.fase, f.fim, f.inicio INTO v_fase_id, v_fase, v_fim, v_inicio
    FROM public.rematricula_2027_fases f
    WHERE f.fase = p_fase
    LIMIT 1;
  END IF;

  IF v_fase_id IS NULL THEN
    SELECT f.id, f.fase, f.fim, f.inicio INTO v_fase_id, v_fase, v_fim, v_inicio
    FROM public.rematricula_2027_fases f
    WHERE f.ativo = true
      AND f.inicio <= v_hoje
      AND (f.fim IS NULL OR f.fim >= v_hoje)
    ORDER BY f.inicio DESC
    LIMIT 1;
  END IF;

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
$function$;

-- Consulta pública de valores: considera a exceção do aluno quando informado
CREATE OR REPLACE FUNCTION public.rematricula_2027_valores_curso(p_curso text, p_id_aluno bigint DEFAULT NULL)
 RETURNS TABLE(valor_cheio numeric, valor_avista numeric, valor_parcelado numeric, fase integer, fase_fim date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.valor_cheio, v.valor_avista, v.valor_parcelado, v.fase, v.fase_fim
  FROM public.rematricula_2027_valor_vigente(
    p_curso,
    (SELECT a.fase_excecao::int FROM public.alunos_rematricula_2027 a WHERE a.id_aluno = p_id_aluno)
  ) v;
$function$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_status(p_id_aluno bigint, p_data_nascimento date)
 RETURNS TABLE(contrato_gerado boolean, contrato_assinado boolean, rematricula_concluida boolean, link_contrato text, checkout_url text, forma_pagamento text, parcelas integer, valor_avista numeric, valor_parcelado numeric, max_parcelas integer, isentar_valor_rematricula boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(a.contrato_gerado, false),
    COALESCE(a.contrato_assinado, false),
    COALESCE(a.rematricula_concluida, false),
    a.link_contrato,
    a.checkout_url,
    a.forma_pagamento,
    a.parcelas,
    CASE WHEN COALESCE(a.isentar_valor_rematricula, false) THEN 0::numeric
         ELSE COALESCE(v.valor_avista, 0)::numeric END,
    CASE WHEN COALESCE(a.isentar_valor_rematricula, false) THEN 0::numeric
         ELSE COALESCE(v.valor_parcelado, 0)::numeric END,
    12,
    COALESCE(a.isentar_valor_rematricula, false)
  FROM public.alunos_rematricula_2027 a
  LEFT JOIN LATERAL public.rematricula_2027_valor_vigente(a.curso_2027, a.fase_excecao::int) v ON true
  WHERE a.id_aluno = p_id_aluno
    AND a.data_nascimento_aluno = p_data_nascimento
  LIMIT 1;
END;
$function$;

-- Números da sorte: respeita a fase concedida por exceção
CREATE OR REPLACE FUNCTION public.gerar_numeros_sorte_2027(p_id_aluno bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_excecao smallint;
  v_qtd integer := 0;
  v_faixa text;
  v_inicio date;
  v_fim date;
  v_gerados integer := 0;
  v_num text;
  v_try integer;
BEGIN
  SELECT a.fase_excecao INTO v_excecao
  FROM public.alunos_rematricula_2027 a WHERE a.id_aluno = p_id_aluno;

  IF v_excecao IS NOT NULL THEN
    SELECT f.numeros_sorte, f.inicio, f.fim
      INTO v_qtd, v_inicio, v_fim
    FROM public.rematricula_2027_fases f
    WHERE f.fase = v_excecao
    LIMIT 1;
  ELSE
    SELECT f.numeros_sorte, f.inicio, f.fim
      INTO v_qtd, v_inicio, v_fim
    FROM public.rematricula_2027_fases f
    WHERE f.ativo = true
      AND f.inicio <= v_hoje
      AND f.fim IS NOT NULL AND f.fim >= v_hoje
    ORDER BY f.inicio DESC
    LIMIT 1;
  END IF;

  IF v_qtd IS NULL OR v_qtd <= 0 THEN
    RETURN 0;
  END IF;

  v_faixa := to_char(v_inicio, 'DD/MM') || ' a ' || COALESCE(to_char(v_fim, 'DD/MM'), '—');

  PERFORM pg_advisory_xact_lock(hashtext('numeros_sorte_2027'));

  IF EXISTS (SELECT 1 FROM public.rematricula_2027_numeros_sorte WHERE id_aluno = p_id_aluno) THEN
    RETURN 0;
  END IF;

  WHILE v_gerados < v_qtd LOOP
    v_try := 0;
    LOOP
      v_try := v_try + 1;
      v_num := lpad(floor(random() * 10000)::int::text, 4, '0');
      BEGIN
        INSERT INTO public.rematricula_2027_numeros_sorte (id_aluno, numero, faixa)
        VALUES (p_id_aluno, v_num, v_faixa);
        v_gerados := v_gerados + 1;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_try > 500 THEN
          RAISE EXCEPTION 'sem_numeros_disponiveis';
        END IF;
      END;
    END LOOP;
  END LOOP;

  RETURN v_gerados;
END;
$function$;

-- Concessão da exceção pelo painel
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
     OR COALESCE(v_aluno.rematricula_concluida, false)
     OR COALESCE(v_aluno.cancelada, false) THEN
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

GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_fase_excecao(bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_valor_vigente(text, integer) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_valores_curso(text, bigint) TO anon, authenticated, service_role;