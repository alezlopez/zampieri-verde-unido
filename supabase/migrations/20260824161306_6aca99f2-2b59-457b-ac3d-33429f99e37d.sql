DROP FUNCTION IF EXISTS public.rematricula_2027_admin_listagem();

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_listagem()
 RETURNS TABLE(id_aluno bigint, nome_aluno text, curso_atual text, curso_2027 text, turno_escolhido text, responsavel_financeiro text, contrato_gerado boolean, contrato_assinado boolean, rematricula_concluida boolean, forma_pagamento text, parcelas integer, valor_pago numeric, data_pagamento timestamp with time zone, link_contrato text, numeros text[], conferida boolean, conferida_em timestamp with time zone, percentual_desconto numeric, valor_com_desconto numeric, valor_cheio numeric, nome_pai text, cpf_pai text, celular_pai text, telefone_pai text, email_pai text, nome_mae text, cpf_mae text, celular_mae text, telefone_mae text, email_mae text, qtd_alteracoes integer, alteracoes jsonb, updated_at timestamp with time zone, checkout_criado_em timestamp with time zone, checkout_url text, cancelada boolean, cancelada_em timestamp with time zone, motivo_cancelamento text, estorno_valor numeric, estorno_em timestamp with time zone)
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
         a.estorno_valor, a.estorno_em
  FROM public.alunos_rematricula_2027 a
  ORDER BY a.nome_aluno;
END;
$function$;