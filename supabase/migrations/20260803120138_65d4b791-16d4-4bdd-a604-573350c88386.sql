ALTER TABLE public.alunos_rematricula_2027
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_checkout_id text,
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS checkout_criado_em timestamptz,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS parcelas integer,
  ADD COLUMN IF NOT EXISTS valor_pago numeric,
  ADD COLUMN IF NOT EXISTS data_pagamento timestamptz;

CREATE OR REPLACE FUNCTION public.rematricula_2027_status(p_id_aluno bigint, p_data_nascimento date)
RETURNS TABLE(
  contrato_gerado boolean,
  contrato_assinado boolean,
  rematricula_concluida boolean,
  link_contrato text,
  checkout_url text,
  forma_pagamento text,
  parcelas integer,
  valor_avista numeric,
  valor_parcelado numeric,
  max_parcelas integer
)
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
    COALESCE(
      CASE
        WHEN v.valor_promocional IS NOT NULL
          AND (v.promocao_ate IS NULL OR v.promocao_ate >= CURRENT_DATE)
        THEN v.valor_promocional
        ELSE v.valor_rematricula
      END, 0)::numeric,
    CASE
      WHEN v.valor_promocional_pacelado IS NOT NULL
        AND (v.promocao_ate IS NULL OR v.promocao_ate >= CURRENT_DATE)
      THEN v.valor_promocional_pacelado
      ELSE v.valor_rematricula
    END::numeric,
    12
  FROM public.alunos_rematricula_2027 a
  LEFT JOIN public.rematricula_valores_2027 v
    ON v.curso_2027 = a.curso_2027 AND v.ativo = true
  WHERE a.id_aluno = p_id_aluno
    AND a.data_nascimento_aluno = p_data_nascimento
  LIMIT 1;
END;
$function$;

DROP FUNCTION IF EXISTS public.rematricula_2027_abrir(bigint, date);

CREATE OR REPLACE FUNCTION public.rematricula_2027_abrir(p_id_aluno bigint, p_data_nascimento date)
 RETURNS TABLE(id_aluno bigint, nome_aluno text, cpf_aluno text, data_nascimento_aluno date, curso_atual text, curso_2027 text, valor_cheio numeric, valor_com_desconto numeric, percentual_desconto numeric, dia_vencimento smallint, responsavel_financeiro text, turno_escolhido text, tem_pai text, nome_pai text, cpf_pai text, rg_pai text, estado_civil_pai text, naturalidade_pai text, nacionalidade_pai text, cep_pai text, logradouro_pai text, numero_pai text, complemento_pai text, bairro_pai text, cidade_pai text, estado_pai text, data_nascimento_pai date, celular_pai text, email_pai text, tem_mae text, nome_mae text, cpf_mae text, rg_mae text, estado_civil_mae text, naturalidade_mae text, nacionalidade_mae text, cep_mae text, logradouro_mae text, numero_mae text, complemento_mae text, bairro_mae text, cidade_mae text, estado_mae text, data_nascimento_mae date, celular_mae text, email_mae text, valor_rematricula numeric, contrato_gerado boolean, contrato_assinado boolean, link_contrato text, rematricula_concluida boolean, checkout_url text, forma_pagamento text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
  LIMIT 1;
END;
$function$;