
CREATE OR REPLACE FUNCTION public.marcar_ingresso_utilizado(p_id uuid)
RETURNS TABLE(success boolean, message text, ingresso_id uuid, evento_titulo text, nome_participante text, tipo_ingresso text, utilizado_em timestamptz, utilizado_por uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing record;
  v_uid uuid := auth.uid();
  v_evt text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
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
$$;

CREATE OR REPLACE FUNCTION public.validar_meia_ingresso(p_id uuid)
RETURNS TABLE(success boolean, message text, ingresso_id uuid, meia_validada_em timestamptz, meia_validada_por uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing record;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
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
$$;
