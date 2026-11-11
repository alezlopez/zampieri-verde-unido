-- Renegociação 2027: valor atualizado do débito (principal + juros + multa) para a família ver
-- quanto deve hoje, ao lado das ofertas à vista e parcelada.

ALTER TABLE public.devedores_2027 ADD COLUMN IF NOT EXISTS valor_atualizado numeric;

UPDATE public.devedores_2027
   SET valor_atualizado = COALESCE(valor_principal, 0) + COALESCE(juros, 0) + COALESCE(multa, 0)
 WHERE valor_atualizado IS NULL;

-- Portal da família: devolve também o valor atualizado
DROP FUNCTION IF EXISTS public.renegociacao_2027_debitos(bigint, date);
CREATE FUNCTION public.renegociacao_2027_debitos(p_id_aluno bigint, p_data_nascimento date)
 RETURNS TABLE(row_id bigint, evento text, vencimento text, valor_principal numeric, juros numeric, multa numeric, valor_a_vista numeric, valor_parcelado numeric, pago boolean, pago_em timestamp with time zone, valor_atualizado numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.rematricula_2027_rate_hit('reneg_debitos', 30, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.alunos_rematricula_2027 a
    WHERE a.id_aluno = p_id_aluno AND a.data_nascimento_aluno = p_data_nascimento
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT d.row_id::bigint, d.evento, d.vencimento, d.valor_principal, d.juros, d.multa,
         d.valor_a_vista, d.valor_parcelado, COALESCE(d.pago, false), d.pago_em, d.valor_atualizado
  FROM public.devedores_2027 d
  WHERE d.id_aluno = p_id_aluno
  ORDER BY d.vencimento;
END;
$function$;
REVOKE ALL ON FUNCTION public.renegociacao_2027_debitos(bigint, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_debitos(bigint, date) TO anon, authenticated, service_role;

-- Admin: mesma coluna
DROP FUNCTION IF EXISTS public.renegociacao_2027_admin_debitos(bigint);
CREATE FUNCTION public.renegociacao_2027_admin_debitos(p_id_aluno bigint)
 RETURNS TABLE(row_id bigint, evento text, vencimento text, valor_a_vista numeric, valor_parcelado numeric, pago boolean, pago_em timestamp with time zone, forma_pagamento text, valor_pago numeric, asaas_payment_id text, baixa_manual_em timestamp with time zone, valor_atualizado numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RAISE EXCEPTION 'nao_autorizado';
  END IF;

  RETURN QUERY
  SELECT d.row_id::bigint, d.evento, d.vencimento, d.valor_a_vista, d.valor_parcelado,
         COALESCE(d.pago, false), d.pago_em, d.forma_pagamento, d.valor_pago,
         d.asaas_payment_id, d.baixa_manual_em, d.valor_atualizado
  FROM public.devedores_2027 d
  WHERE d.id_aluno = p_id_aluno
  ORDER BY d.vencimento;
END;
$function$;
REVOKE ALL ON FUNCTION public.renegociacao_2027_admin_debitos(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_admin_debitos(bigint) TO authenticated, service_role;

-- Importação: aceita valor_atualizado (sem ele, usa principal + juros + multa)
CREATE OR REPLACE FUNCTION public.renegociacao_2027_importar(p_linhas jsonb, p_baixar_ausentes boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inseridos int;
  v_atualizados int;
  v_baixados int := 0;
  v_ignorados_pagos int;
  v_sem_cadastro jsonb;
BEGIN
  IF jsonb_typeof(p_linhas) IS DISTINCT FROM 'array' OR jsonb_array_length(p_linhas) = 0 THEN
    RAISE EXCEPTION 'lista_vazia';
  END IF;

  PERFORM set_config('zampieri.importando_devedores', '1', true);

  DROP TABLE IF EXISTS _imp;
  CREATE TEMP TABLE _imp ON COMMIT DROP AS
  SELECT (l->>'id_aluno')::bigint AS id_aluno,
         NULLIF(trim(l->>'nome_aluno'), '') AS nome_aluno,
         COALESCE(NULLIF(trim(l->>'evento'), ''), 'Mensalidade') AS evento,
         to_char((l->>'vencimento')::date, 'YYYY-MM-DD') AS vencimento,
         (l->>'valor_principal')::numeric AS valor_principal,
         COALESCE((l->>'juros')::numeric, 0) AS juros,
         COALESCE((l->>'multa')::numeric, 0) AS multa,
         (l->>'valor_atualizado')::numeric AS valor_atualizado,
         (l->>'valor_a_vista')::numeric AS valor_a_vista,
         (l->>'valor_parcelado')::numeric AS valor_parcelado
  FROM jsonb_array_elements(p_linhas) l;

  UPDATE _imp SET valor_atualizado = COALESCE(valor_principal, 0) + juros + multa WHERE valor_atualizado IS NULL;

  IF EXISTS (SELECT 1 FROM _imp WHERE id_aluno IS NULL OR vencimento IS NULL OR valor_a_vista IS NULL OR valor_a_vista <= 0) THEN
    RAISE EXCEPTION 'linha_invalida: id_aluno, vencimento e valor_a_vista (> 0) são obrigatórios';
  END IF;
  IF EXISTS (SELECT 1 FROM _imp GROUP BY id_aluno, evento, vencimento HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'linha_duplicada: mesmo aluno, evento e vencimento aparecem mais de uma vez';
  END IF;

  SELECT count(*) INTO v_ignorados_pagos
  FROM _imp i JOIN public.devedores_2027 d USING (id_aluno, evento, vencimento)
  WHERE d.pago;

  UPDATE public.devedores_2027 d
     SET nome_aluno = COALESCE(i.nome_aluno, d.nome_aluno),
         valor_principal = i.valor_principal, juros = i.juros, multa = i.multa,
         valor_atualizado = i.valor_atualizado,
         valor_a_vista = i.valor_a_vista,
         valor_parcelado = COALESCE(i.valor_parcelado, i.valor_a_vista)
    FROM _imp i
   WHERE d.id_aluno = i.id_aluno AND d.evento = i.evento AND d.vencimento = i.vencimento
     AND NOT d.pago;
  GET DIAGNOSTICS v_atualizados = ROW_COUNT;

  INSERT INTO public.devedores_2027 (id_aluno, nome_aluno, evento, vencimento, valor_principal, juros, multa, valor_atualizado, valor_a_vista, valor_parcelado)
  SELECT i.id_aluno, i.nome_aluno, i.evento, i.vencimento, i.valor_principal, i.juros, i.multa,
         i.valor_atualizado, i.valor_a_vista, COALESCE(i.valor_parcelado, i.valor_a_vista)
  FROM _imp i
  WHERE NOT EXISTS (SELECT 1 FROM public.devedores_2027 d
                    WHERE d.id_aluno = i.id_aluno AND d.evento = i.evento AND d.vencimento = i.vencimento);
  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  IF p_baixar_ausentes THEN
    UPDATE public.devedores_2027 d
       SET pago = true, pago_em = now(), forma_pagamento = 'quitado_fora'
     WHERE NOT d.pago
       AND NOT EXISTS (SELECT 1 FROM _imp i
                       WHERE i.id_aluno = d.id_aluno AND i.evento = d.evento AND i.vencimento = d.vencimento);
    GET DIAGNOSTICS v_baixados = ROW_COUNT;
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id_aluno', i.id_aluno, 'nome_aluno', i.nome_aluno)), '[]'::jsonb)
    INTO v_sem_cadastro
  FROM _imp i
  WHERE NOT EXISTS (SELECT 1 FROM public.alunos_rematricula_2027 a WHERE a.id_aluno = i.id_aluno);

  RETURN jsonb_build_object(
    'linhas_recebidas', jsonb_array_length(p_linhas),
    'inseridos', v_inseridos,
    'atualizados', v_atualizados,
    'ja_pagos_ignorados', v_ignorados_pagos,
    'baixados_por_ausencia', v_baixados,
    'sem_cadastro_rematricula', v_sem_cadastro
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_importar(jsonb, boolean) FROM PUBLIC, anon, authenticated;
