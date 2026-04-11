CREATE OR REPLACE FUNCTION public.find_alunos_by_email(p_email text)
RETURNS TABLE(codigo_aluno text, nome_aluno text, curso text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.codigo_aluno, a.nome_aluno, a.curso
  FROM alunos_26 a
  WHERE lower(trim(a.email_pai)) = lower(trim(p_email))
     OR lower(trim(a.email_mae)) = lower(trim(p_email));
END;
$$;