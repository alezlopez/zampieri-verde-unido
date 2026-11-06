
CREATE OR REPLACE FUNCTION public.find_alunos_by_cpf(p_cpf text)
RETURNS TABLE(codigo_aluno text, nome_aluno text, curso text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_clean text;
BEGIN
  cpf_clean := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  
  RETURN QUERY
  SELECT a.codigo_aluno, a.nome_aluno, a.curso
  FROM alunos_26 a
  WHERE regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = cpf_clean;
END;
$$;
