DROP FUNCTION IF EXISTS public.rematricula_2027_buscar(text);

CREATE OR REPLACE FUNCTION public.rematricula_2027_buscar(p_termo text)
 RETURNS TABLE(id_aluno bigint, nome_aluno text, curso_atual text, curso_2027 text, rematricula_liberada boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v text;
BEGIN
  v := regexp_replace(COALESCE(p_termo, ''), '[^0-9]', '', 'g');
  IF length(v) < 10 THEN
    RETURN;
  END IF;

  IF NOT public.rematricula_2027_rate_hit('buscar', 12, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  RETURN QUERY
  SELECT a.id_aluno, a.nome_aluno, a.curso_atual, a.curso_2027,
         COALESCE(a.rematricula_liberada, false)
  FROM public.alunos_rematricula_2027 a
  WHERE regexp_replace(COALESCE(a.celular_pai, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.celular_mae, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.cpf_aluno, ''), '[^0-9]', '', 'g') = v
  ORDER BY a.nome_aluno;
END;
$function$;

REVOKE ALL ON FUNCTION public.rematricula_2027_buscar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_buscar(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rematricula_2027_canais(p_id_aluno bigint)
 RETURNS TABLE(chave text, canal text, rotulo text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a public.alunos_rematricula_2027%ROWTYPE;
  v_tel text;
  v_mail text;
BEGIN
  IF NOT public.rematricula_2027_rate_hit('canais', 20, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  SELECT * INTO a FROM public.alunos_rematricula_2027 WHERE id_aluno = p_id_aluno LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT COALESCE(a.rematricula_liberada, false) THEN
    RETURN;
  END IF;

  v_tel := regexp_replace(COALESCE(a.celular_mae, ''), '[^0-9]', '', 'g');
  IF length(v_tel) >= 10 THEN
    chave := 'celular_mae'; canal := 'whatsapp';
    rotulo := '(' || substr(v_tel, 1, 2) || ') •••••-' || right(v_tel, 4);
    RETURN NEXT;
  END IF;

  v_tel := regexp_replace(COALESCE(a.celular_pai, ''), '[^0-9]', '', 'g');
  IF length(v_tel) >= 10 THEN
    chave := 'celular_pai'; canal := 'whatsapp';
    rotulo := '(' || substr(v_tel, 1, 2) || ') •••••-' || right(v_tel, 4);
    RETURN NEXT;
  END IF;

  v_mail := lower(trim(COALESCE(a.email_mae, '')));
  IF position('@' in v_mail) > 1 THEN
    chave := 'email_mae'; canal := 'email';
    rotulo := left(split_part(v_mail, '@', 1), 2) || '•••@' || split_part(v_mail, '@', 2);
    RETURN NEXT;
  END IF;

  v_mail := lower(trim(COALESCE(a.email_pai, '')));
  IF position('@' in v_mail) > 1 THEN
    chave := 'email_pai'; canal := 'email';
    rotulo := left(split_part(v_mail, '@', 1), 2) || '•••@' || split_part(v_mail, '@', 2);
    RETURN NEXT;
  END IF;

  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_abrir(p_id_aluno bigint, p_data_nascimento date)
 RETURNS TABLE(id_aluno bigint, nome_aluno text, cpf_aluno text, data_nascimento_aluno date, curso_atual text, curso_2027 text, valor_cheio numeric, valor_com_desconto numeric, percentual_desconto numeric, dia_vencimento smallint, responsavel_financeiro text, turno_escolhido text, tem_pai text, nome_pai text, cpf_pai text, rg_pai text, estado_civil_pai text, naturalidade_pai text, nacionalidade_pai text, cep_pai text, logradouro_pai text, numero_pai text, complemento_pai text, bairro_pai text, cidade_pai text, estado_pai text, data_nascimento_pai date, celular_pai text, email_pai text, tem_mae text, nome_mae text, cpf_mae text, rg_mae text, estado_civil_mae text, naturalidade_mae text, nacionalidade_mae text, cep_mae text, logradouro_mae text, numero_mae text, complemento_mae text, bairro_mae text, cidade_mae text, estado_mae text, data_nascimento_mae date, celular_mae text, email_mae text, valor_rematricula numeric, contrato_gerado boolean, contrato_assinado boolean, link_contrato text, rematricula_concluida boolean, checkout_url text, forma_pagamento text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.rematricula_2027_rate_hit('abrir', 20, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  RETURN QUERY
  SELECT
    a.id_aluno, a.nome_aluno, a.cpf_aluno, a.data_nascimento_aluno,
    a.curso_atual, a.curso_2027,
    a.valor_cheio, a.valor_com_desconto, a.percentual_desconto, a.dia_vencimento,
    a.responsavel_financeiro, a.turno_escolhido,
    a.tem_pai, a.nome_pai, a.cpf_pai, a.rg_pai, a.estado_civil_pai, a.naturalidade_pai,
    a.nacionalidade_pai, a.cep_pai, a.logradouro_pai, a.numero_pai, a.complemento_pai,
    a.bairro_pai, a.cidade_pai, a.estado_pai, a.data_nascimento_pai, a.celular_pai, a.email_pai,
    a.tem_mae, a.nome_mae, a.cpf_mae, a.rg_mae, a.estado_civil_mae, a.naturalidade_mae,
    a.nacionalidade_mae, a.cep_mae, a.logradouro_mae, a.numero_mae, a.complemento_mae,
    a.bairro_mae, a.cidade_mae, a.estado_mae, a.data_nascimento_mae, a.celular_mae, a.email_mae,
    COALESCE(
      CASE
        WHEN v.valor_promocional IS NOT NULL
          AND (v.promocao_ate IS NULL OR v.promocao_ate >= CURRENT_DATE)
        THEN v.valor_promocional
        ELSE v.valor_rematricula
      END, 0)::numeric,
    COALESCE(a.contrato_gerado, false),
    COALESCE(a.contrato_assinado, false),
    a.link_contrato,
    COALESCE(a.rematricula_concluida, false),
    a.checkout_url,
    a.forma_pagamento
  FROM public.alunos_rematricula_2027 a
  LEFT JOIN public.rematricula_valores_2027 v
    ON v.curso_2027 = a.curso_2027 AND v.ativo = true
  WHERE a.id_aluno = p_id_aluno
    AND a.data_nascimento_aluno = p_data_nascimento
    AND COALESCE(a.rematricula_liberada, false) = true
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_salvar(p_id_aluno bigint, p_data_nascimento date, p_dados jsonb)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aluno public.alunos_rematricula_2027%ROWTYPE;
  v_turno text;
  v_max integer;
  v_ocupadas integer;
  v_campo text;
  v_valor text;
BEGIN
  SELECT * INTO v_aluno
  FROM public.alunos_rematricula_2027
  WHERE id_aluno = p_id_aluno AND data_nascimento_aluno = p_data_nascimento
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'nao_autorizado'::text;
    RETURN;
  END IF;

  IF NOT COALESCE(v_aluno.rematricula_liberada, false) THEN
    RETURN QUERY SELECT false, 'nao_liberada'::text;
    RETURN;
  END IF;

  FOREACH v_campo IN ARRAY ARRAY['cpf_aluno','cpf_pai','cpf_mae'] LOOP
    v_valor := NULLIF(trim(COALESCE(p_dados->>v_campo, '')), '');
    IF v_valor IS NOT NULL AND NOT public.valida_cpf(v_valor) THEN
      RETURN QUERY SELECT false, ('cpf_invalido:' || v_campo)::text;
      RETURN;
    END IF;
  END LOOP;

  FOREACH v_campo IN ARRAY ARRAY['email_pai','email_mae'] LOOP
    v_valor := NULLIF(trim(COALESCE(p_dados->>v_campo, '')), '');
    IF v_valor IS NOT NULL AND v_valor !~ '^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$' THEN
      RETURN QUERY SELECT false, ('email_invalido:' || v_campo)::text;
      RETURN;
    END IF;
  END LOOP;

  v_turno := NULLIF(trim(COALESCE(p_dados->>'turno_escolhido', '')), '');

  IF v_turno IS NOT NULL
     AND lower(COALESCE(v_aluno.turno_escolhido, '')) IS DISTINCT FROM lower(v_turno) THEN
    PERFORM pg_advisory_xact_lock(hashtext('remat2027:' || COALESCE(v_aluno.curso_2027,'') || ':' || lower(v_turno)));

    SELECT vt.max_vagas INTO v_max
    FROM public.vagas_2027 vt
    WHERE vt.ativo = true
      AND vt.curso_2027 = v_aluno.curso_2027
      AND lower(trim(vt.turno)) = lower(v_turno);

    IF v_max IS NULL THEN
      RETURN QUERY SELECT false, 'turno_indisponivel'::text;
      RETURN;
    END IF;

    SELECT COUNT(*)::integer INTO v_ocupadas
    FROM public.alunos_rematricula_2027 a
    WHERE a.curso_2027 = v_aluno.curso_2027
      AND lower(trim(a.turno_escolhido)) = lower(v_turno);

    IF v_ocupadas >= v_max THEN
      RETURN QUERY SELECT false, 'sem_vagas'::text;
      RETURN;
    END IF;
  END IF;

  UPDATE public.alunos_rematricula_2027 a SET
    cpf_aluno = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cpf_aluno','')), ''), a.cpf_aluno),

    nome_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nome_mae','')), ''), a.nome_mae),
    cpf_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cpf_mae','')), ''), a.cpf_mae),
    rg_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'rg_mae','')), ''), a.rg_mae),
    estado_civil_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_civil_mae','')), ''), a.estado_civil_mae),
    naturalidade_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'naturalidade_mae','')), ''), a.naturalidade_mae),
    nacionalidade_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nacionalidade_mae','')), ''), a.nacionalidade_mae),
    cep_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cep_mae','')), ''), a.cep_mae),
    logradouro_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'logradouro_mae','')), ''), a.logradouro_mae),
    numero_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'numero_mae','')), ''), a.numero_mae),
    complemento_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'complemento_mae','')), ''), a.complemento_mae),
    bairro_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'bairro_mae','')), ''), a.bairro_mae),
    cidade_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cidade_mae','')), ''), a.cidade_mae),
    estado_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_mae','')), ''), a.estado_mae),
    data_nascimento_mae = COALESCE((NULLIF(trim(COALESCE(p_dados->>'data_nascimento_mae','')), ''))::date, a.data_nascimento_mae),
    celular_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'celular_mae','')), ''), a.celular_mae),
    email_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'email_mae','')), ''), a.email_mae),

    nome_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nome_pai','')), ''), a.nome_pai),
    cpf_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cpf_pai','')), ''), a.cpf_pai),
    rg_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'rg_pai','')), ''), a.rg_pai),
    estado_civil_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_civil_pai','')), ''), a.estado_civil_pai),
    naturalidade_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'naturalidade_pai','')), ''), a.naturalidade_pai),
    nacionalidade_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nacionalidade_pai','')), ''), a.nacionalidade_pai),
    cep_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cep_pai','')), ''), a.cep_pai),
    logradouro_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'logradouro_pai','')), ''), a.logradouro_pai),
    numero_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'numero_pai','')), ''), a.numero_pai),
    complemento_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'complemento_pai','')), ''), a.complemento_pai),
    bairro_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'bairro_pai','')), ''), a.bairro_pai),
    cidade_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cidade_pai','')), ''), a.cidade_pai),
    estado_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_pai','')), ''), a.estado_pai),
    data_nascimento_pai = COALESCE((NULLIF(trim(COALESCE(p_dados->>'data_nascimento_pai','')), ''))::date, a.data_nascimento_pai),
    celular_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'celular_pai','')), ''), a.celular_pai),
    email_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'email_pai','')), ''), a.email_pai),

    turno_escolhido = COALESCE(v_turno, a.turno_escolhido),
    responsavel_financeiro = COALESCE(NULLIF(trim(COALESCE(p_dados->>'responsavel_financeiro','')), ''), a.responsavel_financeiro),
    updated_at = now()
  WHERE a.id_aluno = p_id_aluno;

  RETURN QUERY SELECT true, 'ok'::text;
END;
$function$;