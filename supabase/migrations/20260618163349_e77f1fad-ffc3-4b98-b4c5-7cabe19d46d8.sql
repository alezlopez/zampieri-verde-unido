-- 1) Novo papel no enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'conferente';

-- (Os ALTERs no enum precisam ser commitados antes de uso. Para uso na MESMA migração,
-- usamos comparações via cast text no corpo das funções a seguir.)

-- 2) Atualiza funções existentes para aceitar admin OU conferente
CREATE OR REPLACE FUNCTION public.marcar_ingresso_utilizado(p_id uuid)
 RETURNS TABLE(success boolean, message text, ingresso_id uuid, evento_titulo text, nome_participante text, tipo_ingresso text, utilizado_em timestamp with time zone, utilizado_por uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ing record;
  v_uid uuid := auth.uid();
  v_evt text;
  v_autorizado boolean;
BEGIN
  v_autorizado := v_uid IS NOT NULL AND (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role::text = 'conferente')
  );
  IF NOT v_autorizado THEN
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

CREATE OR REPLACE FUNCTION public.validar_meia_ingresso(p_id uuid)
 RETURNS TABLE(success boolean, message text, ingresso_id uuid, meia_validada_em timestamp with time zone, meia_validada_por uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ing record;
  v_uid uuid := auth.uid();
  v_autorizado boolean;
BEGIN
  v_autorizado := v_uid IS NOT NULL AND (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role::text = 'conferente')
  );
  IF NOT v_autorizado THEN
    RETURN QUERY SELECT false, 'forbidden'::text, NULL::uuid, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_ing FROM public.ingressos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'nao_encontrado'::text, NULL::uuid, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  IF v_ing.tipo_ingresso <> 'meia' THEN
    RETURN QUERY SELECT false, 'nao_e_meia'::text, v_ing.id, v_ing.meia_validada_em, v_ing.meia_validada_por;
    RETURN;
  END IF;

  IF v_ing.meia_validada_portaria THEN
    RETURN QUERY SELECT false, 'ja_validada'::text, v_ing.id, v_ing.meia_validada_em, v_ing.meia_validada_por;
    RETURN;
  END IF;

  UPDATE public.ingressos
    SET meia_validada_portaria = true, meia_validada_em = now(), meia_validada_por = v_uid
    WHERE id = p_id;

  RETURN QUERY SELECT true, 'ok'::text, v_ing.id, now(), v_uid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_produto_retirado(p_qr_token uuid)
 RETURNS TABLE(ok boolean, message text, pedido_id uuid, produto text, variacao text, quantidade integer, retirado_em timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido pedidos_produtos%ROWTYPE;
  v_prod_nome text;
  v_var_nome text;
  v_uid uuid := auth.uid();
  v_autorizado boolean;
BEGIN
  v_autorizado := v_uid IS NOT NULL AND (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role::text = 'conferente')
  );
  IF NOT v_autorizado THEN
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

-- 3) RPC de leitura de ingresso para conferência (sem valores)
CREATE OR REPLACE FUNCTION public.buscar_ingresso_scan(p_id uuid)
 RETURNS TABLE(
   id uuid,
   nome_comprador text,
   nome_participante text,
   tipo_participante text,
   status text,
   utilizado boolean,
   utilizado_em timestamptz,
   utilizado_por uuid,
   codigo_aluno text,
   tipo_ingresso text,
   categoria_meia text,
   meia_validada_portaria boolean,
   meia_validada_em timestamptz,
   meia_validada_por uuid,
   evento_titulo text,
   evento_data date
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_autorizado boolean;
BEGIN
  v_autorizado := v_uid IS NOT NULL AND (
    public.has_role(v_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role::text = 'conferente')
  );
  IF NOT v_autorizado THEN
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

GRANT EXECUTE ON FUNCTION public.buscar_ingresso_scan(uuid) TO authenticated;
