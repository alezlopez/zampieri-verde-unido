REVOKE EXECUTE ON FUNCTION public.has_setor(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_setor(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_conferir(p_id_aluno bigint, p_conferida boolean)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RETURN QUERY SELECT false, 'nao_autorizado'::text;
    RETURN;
  END IF;

  UPDATE public.alunos_rematricula_2027
    SET conferida = p_conferida,
        conferida_em = CASE WHEN p_conferida THEN now() ELSE NULL END,
        conferida_por = CASE WHEN p_conferida THEN auth.uid() ELSE NULL END
  WHERE id_aluno = p_id_aluno;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'nao_encontrado'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'ok'::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_editar_contatos(p_id_aluno bigint, p_cpf_pai text DEFAULT NULL::text, p_telefone_pai text DEFAULT NULL::text, p_celular_pai text DEFAULT NULL::text, p_cpf_mae text DEFAULT NULL::text, p_telefone_mae text DEFAULT NULL::text, p_celular_mae text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_norm_cpf_pai text := NULLIF(regexp_replace(COALESCE(p_cpf_pai, ''), '\D', '', 'g'), '');
  v_norm_cpf_mae text := NULLIF(regexp_replace(COALESCE(p_cpf_mae, ''), '\D', '', 'g'), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RETURN QUERY SELECT false, 'Acesso negado.'; RETURN;
  END IF;

  IF v_norm_cpf_pai IS NOT NULL AND length(v_norm_cpf_pai) <> 11 THEN
    RETURN QUERY SELECT false, 'CPF do pai inválido.'; RETURN;
  END IF;
  IF v_norm_cpf_mae IS NOT NULL AND length(v_norm_cpf_mae) <> 11 THEN
    RETURN QUERY SELECT false, 'CPF da mãe inválido.'; RETURN;
  END IF;

  UPDATE public.alunos_rematricula_2027 a
     SET cpf_pai = COALESCE(v_norm_cpf_pai, a.cpf_pai),
         cpf_mae = COALESCE(v_norm_cpf_mae, a.cpf_mae),
         telefone_pai = COALESCE(NULLIF(trim(COALESCE(p_telefone_pai, '')), ''), a.telefone_pai),
         celular_pai = COALESCE(NULLIF(trim(COALESCE(p_celular_pai, '')), ''), a.celular_pai),
         telefone_mae = COALESCE(NULLIF(trim(COALESCE(p_telefone_mae, '')), ''), a.telefone_mae),
         celular_mae = COALESCE(NULLIF(trim(COALESCE(p_celular_mae, '')), ''), a.celular_mae),
         updated_at = now()
   WHERE a.id_aluno = p_id_aluno;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Aluno não encontrado.'; RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Dados atualizados.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_listagem()
 RETURNS TABLE(id_aluno bigint, nome_aluno text, curso_atual text, curso_2027 text, turno_escolhido text, responsavel_financeiro text, contrato_gerado boolean, contrato_assinado boolean, rematricula_concluida boolean, forma_pagamento text, parcelas integer, valor_pago numeric, data_pagamento timestamp with time zone, link_contrato text, numeros text[], conferida boolean, conferida_em timestamp with time zone, percentual_desconto numeric, valor_com_desconto numeric, valor_cheio numeric, nome_pai text, cpf_pai text, celular_pai text, telefone_pai text, email_pai text, nome_mae text, cpf_mae text, celular_mae text, telefone_mae text, email_mae text, qtd_alteracoes integer, alteracoes jsonb, updated_at timestamp with time zone, checkout_criado_em timestamp with time zone, checkout_url text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
         a.updated_at, a.checkout_criado_em, a.checkout_url
  FROM public.alunos_rematricula_2027 a
  ORDER BY a.nome_aluno;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_ingresso_scan(p_id uuid)
 RETURNS TABLE(id uuid, nome_comprador text, nome_participante text, tipo_participante text, status text, utilizado boolean, utilizado_em timestamp with time zone, utilizado_por uuid, codigo_aluno text, tipo_ingresso text, categoria_meia text, meia_validada_portaria boolean, meia_validada_em timestamp with time zone, meia_validada_por uuid, evento_titulo text, evento_data date)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_setor(v_uid, 'portaria') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT i.id, i.nome_comprador, i.nome_participante, i.tipo_participante, i.status,
         i.utilizado, i.utilizado_em, i.utilizado_por, i.codigo_aluno, i.tipo_ingresso,
         i.categoria_meia, i.meia_validada_portaria, i.meia_validada_em, i.meia_validada_por,
         e.titulo, e.data_evento
  FROM public.ingressos i
  LEFT JOIN public.eventos e ON e.id = i.evento_id
  WHERE i.id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_ingresso_utilizado(p_id uuid)
 RETURNS TABLE(success boolean, message text, ingresso_id uuid, evento_titulo text, nome_participante text, tipo_ingresso text, utilizado_em timestamp with time zone, utilizado_por uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_ing record;
  v_uid uuid := auth.uid();
  v_evt text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_setor(v_uid, 'portaria') THEN
    RETURN QUERY SELECT false, 'forbidden'::text, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_ing FROM public.ingressos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'nao_encontrado'::text, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  SELECT titulo INTO v_evt FROM public.eventos WHERE id = v_ing.evento_id;

  IF v_ing.status <> 'pago' THEN
    RETURN QUERY SELECT false, 'nao_pago'::text, v_ing.id, v_evt, COALESCE(v_ing.nome_participante, v_ing.nome_comprador), v_ing.tipo_ingresso, v_ing.utilizado_em, v_ing.utilizado_por;
    RETURN;
  END IF;

  IF v_ing.tipo_ingresso = 'meia' AND NOT v_ing.meia_validada_portaria THEN
    RETURN QUERY SELECT false, 'meia_nao_validada'::text, v_ing.id, v_evt, COALESCE(v_ing.nome_participante, v_ing.nome_comprador), v_ing.tipo_ingresso, v_ing.utilizado_em, v_ing.utilizado_por;
    RETURN;
  END IF;

  IF v_ing.utilizado THEN
    RETURN QUERY SELECT false, 'ja_utilizado'::text, v_ing.id, v_evt, COALESCE(v_ing.nome_participante, v_ing.nome_comprador), v_ing.tipo_ingresso, v_ing.utilizado_em, v_ing.utilizado_por;
    RETURN;
  END IF;

  UPDATE public.ingressos
    SET utilizado = true, utilizado_em = now(), utilizado_por = v_uid
    WHERE id = p_id;

  RETURN QUERY SELECT true, 'ok'::text, v_ing.id, v_evt, COALESCE(v_ing.nome_participante, v_ing.nome_comprador), v_ing.tipo_ingresso, now(), v_uid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_produto_retirado(p_qr_token uuid)
 RETURNS TABLE(ok boolean, message text, pedido_id uuid, produto text, variacao text, quantidade integer, retirado_em timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido pedidos_produtos%ROWTYPE;
  v_prod_nome text;
  v_var_nome text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_setor(v_uid, 'portaria') THEN
    RETURN QUERY SELECT false, 'sem_permissao'::text, NULL::uuid, NULL::text, NULL::text, NULL::int, NULL::timestamptz;
    RETURN;
  END IF;
  SELECT * INTO v_pedido FROM pedidos_produtos WHERE qr_token = p_qr_token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'nao_encontrado'::text, NULL::uuid, NULL::text, NULL::text, NULL::int, NULL::timestamptz;
    RETURN;
  END IF;
  IF v_pedido.status <> 'pago' AND v_pedido.status <> 'retirado' THEN
    RETURN QUERY SELECT false, ('status_invalido:' || v_pedido.status)::text, v_pedido.id, NULL::text, NULL::text, v_pedido.quantidade, v_pedido.retirado_em;
    RETURN;
  END IF;
  SELECT p.nome, v.nome INTO v_prod_nome, v_var_nome
  FROM produtos p JOIN produto_variacoes v ON v.id = v_pedido.variacao_id
  WHERE p.id = v_pedido.produto_id;
  IF v_pedido.status = 'retirado' THEN
    RETURN QUERY SELECT false, 'ja_retirado'::text, v_pedido.id, v_prod_nome, v_var_nome, v_pedido.quantidade, v_pedido.retirado_em;
    RETURN;
  END IF;
  UPDATE pedidos_produtos
    SET status = 'retirado', retirado_em = now(), retirado_por = v_uid
    WHERE id = v_pedido.id;
  RETURN QUERY SELECT true, 'ok'::text, v_pedido.id, v_prod_nome, v_var_nome, v_pedido.quantidade, now();
END;
$function$;