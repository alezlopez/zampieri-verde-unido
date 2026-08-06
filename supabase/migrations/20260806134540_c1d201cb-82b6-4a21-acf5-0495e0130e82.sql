ALTER TABLE public.alunos_rematricula_2027
  ADD COLUMN IF NOT EXISTS telefone_pai text,
  ADD COLUMN IF NOT EXISTS telefone_mae text;

CREATE OR REPLACE FUNCTION public.trg_log_alteracoes_rematricula_2027()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_campos text[] := ARRAY[
    'cpf_aluno','curso_2027','turno_escolhido','responsavel_financeiro',
    'nome_pai','cpf_pai','rg_pai','estado_civil_pai','naturalidade_pai','nacionalidade_pai',
    'cep_pai','logradouro_pai','numero_pai','complemento_pai','bairro_pai','cidade_pai','estado_pai',
    'data_nascimento_pai','celular_pai','telefone_pai','email_pai',
    'nome_mae','cpf_mae','rg_mae','estado_civil_mae','naturalidade_mae','nacionalidade_mae',
    'cep_mae','logradouro_mae','numero_mae','complemento_mae','bairro_mae','cidade_mae','estado_mae',
    'data_nascimento_mae','celular_mae','telefone_mae','email_mae'
  ];
  v_campo text;
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_a text;
  v_b text;
BEGIN
  FOREACH v_campo IN ARRAY v_campos LOOP
    v_a := v_old ->> v_campo;
    v_b := v_new ->> v_campo;
    IF v_a IS DISTINCT FROM v_b THEN
      INSERT INTO public.rematricula_2027_alteracoes (id_aluno, campo, valor_anterior, valor_novo)
      VALUES (NEW.id_aluno, v_campo, v_a, v_b);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_editar_contatos(
  p_id_aluno bigint,
  p_cpf_pai text DEFAULT NULL,
  p_telefone_pai text DEFAULT NULL,
  p_celular_pai text DEFAULT NULL,
  p_cpf_mae text DEFAULT NULL,
  p_telefone_mae text DEFAULT NULL,
  p_celular_mae text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_norm_cpf_pai text := NULLIF(regexp_replace(COALESCE(p_cpf_pai, ''), '\D', '', 'g'), '');
  v_norm_cpf_mae text := NULLIF(regexp_replace(COALESCE(p_cpf_mae, ''), '\D', '', 'g'), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
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

GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_editar_contatos(bigint, text, text, text, text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.rematricula_2027_admin_listagem();

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_listagem()
 RETURNS TABLE(id_aluno bigint, nome_aluno text, curso_atual text, curso_2027 text, turno_escolhido text, responsavel_financeiro text, contrato_gerado boolean, contrato_assinado boolean, rematricula_concluida boolean, forma_pagamento text, parcelas integer, valor_pago numeric, data_pagamento timestamp with time zone, link_contrato text, numeros text[], conferida boolean, conferida_em timestamp with time zone, percentual_desconto numeric, valor_com_desconto numeric, valor_cheio numeric, nome_pai text, cpf_pai text, celular_pai text, telefone_pai text, email_pai text, nome_mae text, cpf_mae text, celular_mae text, telefone_mae text, email_mae text, qtd_alteracoes integer, alteracoes jsonb, updated_at timestamp with time zone, checkout_criado_em timestamp with time zone, checkout_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
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

GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_listagem() TO authenticated;