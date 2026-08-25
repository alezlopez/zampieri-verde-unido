CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_editar_valores(p_id_aluno bigint, p_percentual_desconto numeric, p_percentual_desconto_ext text, p_valor_com_desconto numeric, p_valor_com_desconto_ext text)
 RETURNS TABLE(success boolean, message text)
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

  IF COALESCE(v_row.contrato_assinado, false)
     OR COALESCE(v_row.rematricula_concluida, false)
     OR v_row.data_pagamento IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Contrato assinado ou rematrícula paga: valores não podem ser alterados.'::text;
    RETURN;
  END IF;

  IF p_percentual_desconto IS NULL
     OR (p_percentual_desconto % 1) <> 0
     OR (
       (p_percentual_desconto < 5 OR p_percentual_desconto > 60)
       AND p_percentual_desconto <> COALESCE(v_row.percentual_desconto, -1)
     ) THEN
    RETURN QUERY SELECT false, 'Percentual inválido (5 a 60, de 1 em 1).'::text;
    RETURN;
  END IF;

  IF p_valor_com_desconto IS NULL OR p_valor_com_desconto <= 0 THEN
    RETURN QUERY SELECT false, 'Mensalidade com desconto inválida.'::text;
    RETURN;
  END IF;

  IF COALESCE(v_row.percentual_desconto, -1) <> p_percentual_desconto THEN
    INSERT INTO public.rematricula_2027_alteracoes (id_aluno, campo, valor_anterior, valor_novo)
    VALUES (p_id_aluno, 'percentual_desconto', v_row.percentual_desconto::text, p_percentual_desconto::text);
  END IF;

  IF COALESCE(v_row.valor_com_desconto, -1) <> p_valor_com_desconto THEN
    INSERT INTO public.rematricula_2027_alteracoes (id_aluno, campo, valor_anterior, valor_novo)
    VALUES (p_id_aluno, 'valor_com_desconto', v_row.valor_com_desconto::text, p_valor_com_desconto::text);
  END IF;

  IF COALESCE(v_row.percentual_desconto_ext, '') <> COALESCE(p_percentual_desconto_ext, '') THEN
    INSERT INTO public.rematricula_2027_alteracoes (id_aluno, campo, valor_anterior, valor_novo)
    VALUES (p_id_aluno, 'percentual_desconto_ext', v_row.percentual_desconto_ext, p_percentual_desconto_ext);
  END IF;

  IF COALESCE(v_row.valor_com_desconto_ext, '') <> COALESCE(p_valor_com_desconto_ext, '') THEN
    INSERT INTO public.rematricula_2027_alteracoes (id_aluno, campo, valor_anterior, valor_novo)
    VALUES (p_id_aluno, 'valor_com_desconto_ext', v_row.valor_com_desconto_ext, p_valor_com_desconto_ext);
  END IF;

  UPDATE public.alunos_rematricula_2027
  SET percentual_desconto = p_percentual_desconto,
      percentual_desconto_ext = NULLIF(p_percentual_desconto_ext, ''),
      valor_com_desconto = p_valor_com_desconto,
      valor_com_desconto_ext = NULLIF(p_valor_com_desconto_ext, ''),
      contrato_gerado = CASE WHEN COALESCE(contrato_gerado, false) THEN false ELSE contrato_gerado END,
      link_contrato = CASE WHEN COALESCE(contrato_gerado, false) THEN NULL ELSE link_contrato END,
      zapsign_token = CASE WHEN COALESCE(contrato_gerado, false) THEN NULL ELSE zapsign_token END,
      updated_at = now()
  WHERE id_aluno = p_id_aluno;

  RETURN QUERY SELECT true, 'Valores atualizados.'::text;
END;
$function$;