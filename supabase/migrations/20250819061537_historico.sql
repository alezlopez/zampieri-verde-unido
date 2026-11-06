-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250819061537).

-- Remove both specific versions of the function
DROP FUNCTION IF EXISTS public.update_rematricula_fields(
  p_cod_aluno bigint, 
  p_endereco text, 
  p_numero bigint, 
  p_bairro text, 
  p_cidade text, 
  p_cep text, 
  p_estado text, 
  p_telefone_pai text, 
  p_telefone_mae text, 
  p_email_pai text, 
  p_email_mae text, 
  p_resp_financeiro text, 
  p_turno_2026 text, 
  p_rg_resp_financeiro text, 
  p_estado_civil_resp_financeiro text, 
  p_profissao_resp_financeiro text, 
  p_data_nascimento_resp_financeiro text, 
  p_data_nascimento_aluno text
);

DROP FUNCTION IF EXISTS public.update_rematricula_fields(
  p_cod_aluno bigint, 
  p_endereco text, 
  p_numero bigint, 
  p_bairro text, 
  p_cidade text, 
  p_cep text, 
  p_estado text, 
  p_telefone_pai text, 
  p_telefone_mae text, 
  p_email_pai text, 
  p_email_mae text, 
  p_resp_financeiro text, 
  p_turno_2026 text, 
  p_rg_resp_financeiro text, 
  p_estado_civil_resp_financeiro text, 
  p_profissao_resp_financeiro text, 
  p_data_nascimento_resp_financeiro text, 
  p_data_nascimento_aluno text,
  p_naturalidade_resp_financeiro text
);

-- Create ONE definitive version with all parameters
CREATE FUNCTION public.update_rematricula_fields(
  p_cod_aluno bigint, 
  p_endereco text DEFAULT NULL, 
  p_numero bigint DEFAULT NULL, 
  p_bairro text DEFAULT NULL, 
  p_cidade text DEFAULT NULL, 
  p_cep text DEFAULT NULL, 
  p_estado text DEFAULT NULL, 
  p_telefone_pai text DEFAULT NULL, 
  p_telefone_mae text DEFAULT NULL, 
  p_email_pai text DEFAULT NULL, 
  p_email_mae text DEFAULT NULL, 
  p_resp_financeiro text DEFAULT NULL, 
  p_turno_2026 text DEFAULT NULL, 
  p_rg_resp_financeiro text DEFAULT NULL, 
  p_estado_civil_resp_financeiro text DEFAULT NULL, 
  p_profissao_resp_financeiro text DEFAULT NULL, 
  p_data_nascimento_resp_financeiro text DEFAULT NULL, 
  p_data_nascimento_aluno text DEFAULT NULL,
  p_naturalidade_resp_financeiro text DEFAULT NULL
)
RETURNS SETOF rematricula
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.rematricula
  SET
    "Endereço" = COALESCE(p_endereco, "Endereço"),
    "Número" = COALESCE(p_numero, "Número"),
    "Bairro" = COALESCE(p_bairro, "Bairro"),
    "Cidade" = COALESCE(p_cidade, "Cidade"),
    "CEP" = COALESCE(p_cep, "CEP"),
    "Estado" = COALESCE(p_estado, "Estado"),
    "Telefone do Pai" = COALESCE(p_telefone_pai, "Telefone do Pai"),
    "Telefone da Mãe" = COALESCE(p_telefone_mae, "Telefone da Mãe"),
    "Email do Pai" = COALESCE(p_email_pai, "Email do Pai"),
    "Email da Mãe" = COALESCE(p_email_mae, "Email da Mãe"),
    "Resp. Financeiro" = COALESCE(p_resp_financeiro, "Resp. Financeiro"),
    "Turno 2026" = COALESCE(p_turno_2026, "Turno 2026"),
    "RG Resp. Financeiro" = COALESCE(p_rg_resp_financeiro, "RG Resp. Financeiro"),
    "Estado Civil Resp. Financeiro" = COALESCE(p_estado_civil_resp_financeiro, "Estado Civil Resp. Financeiro"),
    "Profissão Resp. Financeiro" = COALESCE(p_profissao_resp_financeiro, "Profissão Resp. Financeiro"),
    "Data Nascimento Resp. Financeiro" = COALESCE(p_data_nascimento_resp_financeiro, "Data Nascimento Resp. Financeiro"),
    "Data Nascimento Aluno" = COALESCE(p_data_nascimento_aluno, "Data Nascimento Aluno"),
    "Naturalidade do Responsável Financeiro" = COALESCE(p_naturalidade_resp_financeiro, "Naturalidade do Responsável Financeiro"),

    "Atualizou Endereço" = CASE 
      WHEN (p_endereco     IS NOT NULL AND p_endereco     IS DISTINCT FROM "Endereço")
        OR (p_numero       IS NOT NULL AND p_numero       IS DISTINCT FROM "Número")
        OR (p_bairro       IS NOT NULL AND p_bairro       IS DISTINCT FROM "Bairro")
        OR (p_cidade       IS NOT NULL AND p_cidade       IS DISTINCT FROM "Cidade")
        OR (p_cep          IS NOT NULL AND p_cep          IS DISTINCT FROM "CEP")
        OR (p_estado       IS NOT NULL AND p_estado       IS DISTINCT FROM "Estado")
      THEN 'Sim' 
      ELSE "Atualizou Endereço" 
    END,

    "Atualizou dados Pai" = CASE
      WHEN (p_telefone_pai IS NOT NULL AND p_telefone_pai IS DISTINCT FROM "Telefone do Pai")
        OR (p_email_pai    IS NOT NULL AND p_email_pai    IS DISTINCT FROM "Email do Pai")
      THEN 'Sim'
      ELSE "Atualizou dados Pai"
    END,

    "Atualizou dados Mãe" = CASE
      WHEN (p_telefone_mae IS NOT NULL AND p_telefone_mae IS DISTINCT FROM "Telefone da Mãe")
        OR (p_email_mae    IS NOT NULL AND p_email_mae    IS DISTINCT FROM "Email da Mãe")
      THEN 'Sim'
      ELSE "Atualizou dados Mãe"
    END
  WHERE "Cod Aluno" = p_cod_aluno;

  RETURN QUERY
  SELECT *
  FROM public.rematricula
  WHERE "Cod Aluno" = p_cod_aluno;
END;
$function$
