-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250819034205).


-- Função para atualizar somente os campos permitidos na tabela rematricula
-- Atualiza por "Cod Aluno" e retorna a linha atualizada
CREATE OR REPLACE FUNCTION public.update_rematricula_fields(
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
  p_email_mae text DEFAULT NULL
)
RETURNS SETOF rematricula
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    -- Marcar flags de atualização conforme os grupos de campos alterados
    "Atualizou Endereço" = CASE 
      WHEN p_endereco IS NOT NULL OR p_numero IS NOT NULL OR p_bairro IS NOT NULL 
        OR p_cidade IS NOT NULL OR p_cep IS NOT NULL OR p_estado IS NOT NULL
      THEN 'Sim' 
      ELSE "Atualizou Endereço" 
    END,
    "Atualizou dados Pai" = CASE 
      WHEN p_telefone_pai IS NOT NULL OR p_email_pai IS NOT NULL 
      THEN 'Sim' 
      ELSE "Atualizou dados Pai" 
    END,
    "Atualizou dados Mãe" = CASE 
      WHEN p_telefone_mae IS NOT NULL OR p_email_mae IS NOT NULL 
      THEN 'Sim' 
      ELSE "Atualizou dados Mãe" 
    END
  WHERE "Cod Aluno" = p_cod_aluno;

  RETURN QUERY
  SELECT *
  FROM public.rematricula
  WHERE "Cod Aluno" = p_cod_aluno;
END;
$$;

-- Conceder permissão de EXECUTE para o cliente anônimo
GRANT EXECUTE ON FUNCTION public.update_rematricula_fields(
  bigint, text, bigint, text, text, text, text, text, text, text, text
) TO anon;
