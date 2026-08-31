ALTER TABLE public.alunos_rematricula_2027
  ADD COLUMN IF NOT EXISTS isentar_valor_rematricula boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.rematricula_2027_status(bigint, date);
CREATE FUNCTION public.rematricula_2027_status(p_id_aluno bigint, p_data_nascimento date)
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
    CASE WHEN COALESCE(a.isentar_valor_rematricula, false) THEN 0::numeric ELSE COALESCE(
      CASE
        WHEN v.valor_promocional IS NOT NULL
          AND (v.promocao_ate IS NULL OR v.promocao_ate >= CURRENT_DATE)
        THEN v.valor_promocional
        ELSE v.valor_rematricula
      END, 0)::numeric END,
    CASE WHEN COALESCE(a.isentar_valor_rematricula, false) THEN 0::numeric ELSE
      CASE
        WHEN v.valor_promocional_pacelado IS NOT NULL
          AND (v.promocao_ate IS NULL OR v.promocao_ate >= CURRENT_DATE)
        THEN v.valor_promocional_pacelado
        ELSE v.valor_rematricula
      END::numeric END,
    12,
    COALESCE(a.isentar_valor_rematricula, false)
  FROM public.alunos_rematricula_2027 a
  LEFT JOIN public.rematricula_valores_2027 v
    ON v.curso_2027 = a.curso_2027 AND v.ativo = true
  WHERE a.id_aluno = p_id_aluno
    AND a.data_nascimento_aluno = p_data_nascimento
  LIMIT 1;
END;
$function$;

DROP FUNCTION IF EXISTS public.rematricula_2027_abrir(bigint, date);
CREATE FUNCTION public.rematricula_2027_abrir(p_id_aluno bigint, p_data_nascimento date)
RETURNS TABLE(id_aluno bigint, nome_aluno text, cpf_aluno text, data_nascimento_aluno date, curso_atual text, curso_2027 text, valor_cheio numeric, valor_com_desconto numeric, percentual_desconto numeric, dia_vencimento smallint, responsavel_financeiro text, turno_escolhido text, tem_pai text, nome_pai text, cpf_pai text, rg_pai text, estado_civil_pai text, naturalidade_pai text, nacionalidade_pai text, cep_pai text, logradouro_pai text, numero_pai text, complemento_pai text, bairro_pai text, cidade_pai text, estado_pai text, data_nascimento_pai date, celular_pai text, email_pai text, tem_mae text, nome_mae text, cpf_mae text, rg_mae text, estado_civil_mae text, naturalidade_mae text, nacionalidade_mae text, cep_mae text, logradouro_mae text, numero_mae text, complemento_mae text, bairro_mae text, cidade_mae text, estado_mae text, data_nascimento_mae date, celular_mae text, email_mae text, valor_rematricula numeric, contrato_gerado boolean, contrato_assinado boolean, link_contrato text, rematricula_concluida boolean, checkout_url text, forma_pagamento text, isentar_valor_rematricula boolean)
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
    CASE WHEN COALESCE(a.isentar_valor_rematricula, false) THEN 0::numeric ELSE COALESCE(
      CASE
        WHEN v.valor_promocional IS NOT NULL
          AND (v.promocao_ate IS NULL OR v.promocao_ate >= CURRENT_DATE)
        THEN v.valor_promocional
        ELSE v.valor_rematricula
      END, 0)::numeric END,
    COALESCE(a.contrato_gerado, false),
    COALESCE(a.contrato_assinado, false),
    a.link_contrato,
    COALESCE(a.rematricula_concluida, false),
    a.checkout_url,
    a.forma_pagamento,
    COALESCE(a.isentar_valor_rematricula, false)
  FROM public.alunos_rematricula_2027 a
  LEFT JOIN public.rematricula_valores_2027 v
    ON v.curso_2027 = a.curso_2027 AND v.ativo = true
  WHERE a.id_aluno = p_id_aluno
    AND a.data_nascimento_aluno = p_data_nascimento
    AND COALESCE(a.rematricula_liberada, false) = true
  LIMIT 1;
END;
$function$;

DROP FUNCTION IF EXISTS public.rematricula_2027_admin_listagem();
CREATE FUNCTION public.rematricula_2027_admin_listagem()
RETURNS TABLE(id_aluno bigint, nome_aluno text, curso_atual text, curso_2027 text, turno_escolhido text, responsavel_financeiro text, contrato_gerado boolean, contrato_assinado boolean, rematricula_concluida boolean, forma_pagamento text, parcelas integer, valor_pago numeric, data_pagamento timestamp with time zone, link_contrato text, numeros text[], conferida boolean, conferida_em timestamp with time zone, percentual_desconto numeric, valor_com_desconto numeric, valor_cheio numeric, nome_pai text, cpf_pai text, celular_pai text, telefone_pai text, email_pai text, nome_mae text, cpf_mae text, celular_mae text, telefone_mae text, email_mae text, qtd_alteracoes integer, alteracoes jsonb, updated_at timestamp with time zone, checkout_criado_em timestamp with time zone, checkout_url text, cancelada boolean, cancelada_em timestamp with time zone, motivo_cancelamento text, estorno_valor numeric, estorno_em timestamp with time zone, isentar_valor_rematricula boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id_aluno, a.nome_aluno, a.curso_atual, a.curso_2027, a.turno_escolhido,
         a.responsavel_financeiro,
         COALESCE(a.contrato_gerado, false), COALESCE(a.contrato_assinado, false),
         COALESCE(a.rematricula_concluida, false),
         a.forma_pagamento, a.parcelas, a.valor_pago, a.data_pagamento, a.link_contrato,
         COALESCE(ARRAY(
           SELECT n.numero FROM public.rematricula_2027_numeros_sorte n
           WHERE n.id_aluno = a.id_aluno ORDER BY n.numero
         ), ARRAY[]::text[]),
         COALESCE(a.conferida, false), a.conferida_em,
         a.percentual_desconto, a.valor_com_desconto, a.valor_cheio,
         a.nome_pai, a.cpf_pai, a.celular_pai, a.telefone_pai, a.email_pai,
         a.nome_mae, a.cpf_mae, a.celular_mae, a.telefone_mae, a.email_mae,
         COALESCE((SELECT COUNT(*)::int FROM public.rematricula_2027_alteracoes c WHERE c.id_aluno = a.id_aluno), 0),
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'campo', c.campo,
                    'valor_anterior', c.valor_anterior,
                    'valor_novo', c.valor_novo,
                    'created_at', c.created_at
                  ) ORDER BY c.created_at DESC)
           FROM public.rematricula_2027_alteracoes c WHERE c.id_aluno = a.id_aluno
         ), '[]'::jsonb),
         a.updated_at, a.checkout_criado_em, a.checkout_url,
         COALESCE(a.cancelada, false), a.cancelada_em, a.motivo_cancelamento,
         a.estorno_valor, a.estorno_em,
         COALESCE(a.isentar_valor_rematricula, false)
  FROM public.alunos_rematricula_2027 a
  ORDER BY a.nome_aluno;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_isentar(p_id_aluno bigint, p_isento boolean)
RETURNS TABLE(ok boolean, mensagem text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.alunos_rematricula_2027%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_setor(auth.uid(), 'rematricula')) THEN
    RETURN QUERY SELECT false, 'Sem permissão.'::text;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.alunos_rematricula_2027 WHERE id_aluno = p_id_aluno;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Aluno não encontrado.'::text;
    RETURN;
  END IF;

  IF COALESCE(v_row.rematricula_concluida, false) OR v_row.data_pagamento IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Rematrícula já concluída ou paga: isenção não pode ser alterada.'::text;
    RETURN;
  END IF;

  IF COALESCE(v_row.isentar_valor_rematricula, false) <> COALESCE(p_isento, false) THEN
    INSERT INTO public.rematricula_2027_alteracoes (id_aluno, campo, valor_anterior, valor_novo)
    VALUES (p_id_aluno, 'isentar_valor_rematricula',
            COALESCE(v_row.isentar_valor_rematricula, false)::text,
            COALESCE(p_isento, false)::text);
  END IF;

  UPDATE public.alunos_rematricula_2027
  SET isentar_valor_rematricula = COALESCE(p_isento, false),
      updated_at = now()
  WHERE id_aluno = p_id_aluno;

  RETURN QUERY SELECT true, CASE WHEN COALESCE(p_isento, false) THEN 'Aluno isento do valor de rematrícula.' ELSE 'Isenção removida.' END::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.rematricula_2027_admin_isentar(bigint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_isentar(bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_listagem() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_status(bigint, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_abrir(bigint, date) TO anon, authenticated;