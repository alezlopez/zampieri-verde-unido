
-- 1) Boletos / boletins / ocorrências: remover leitura pública
DROP POLICY IF EXISTS "Permitir leitura pública de boletos_26" ON public.boletos_26;
DROP POLICY IF EXISTS "Permitir leitura pública de boletim_mensal_26" ON public.boletim_mensal_26;
DROP POLICY IF EXISTS "Permitir leitura pública de ocorrencias" ON public.ocorrencias_mhund;

REVOKE ALL ON public.boletos_26 FROM anon;
REVOKE ALL ON public.boletim_mensal_26 FROM anon;
REVOKE ALL ON public.ocorrencias_mhund FROM anon;

GRANT SELECT ON public.boletos_26 TO authenticated;
GRANT SELECT ON public.boletim_mensal_26 TO authenticated;
GRANT SELECT ON public.ocorrencias_mhund TO authenticated;
GRANT ALL ON public.boletos_26 TO service_role;
GRANT ALL ON public.boletim_mensal_26 TO service_role;
GRANT ALL ON public.ocorrencias_mhund TO service_role;

CREATE POLICY "Admins leem boletos" ON public.boletos_26
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins leem boletins" ON public.boletim_mensal_26
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins leem ocorrencias" ON public.ocorrencias_mhund
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2) push_tokens: sem leitura/remoção pública
DROP POLICY IF EXISTS "Leitura pública de tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Deleção pública de tokens" ON public.push_tokens;
REVOKE SELECT, UPDATE, DELETE ON public.push_tokens FROM anon;
GRANT INSERT ON public.push_tokens TO anon;
GRANT ALL ON public.push_tokens TO service_role;

-- 3) Rate limit nas buscas públicas por CPF / e-mail
CREATE OR REPLACE FUNCTION public.find_email_by_cpf(p_cpf text)
 RETURNS TABLE(email text, nome text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cpf_clean text;
BEGIN
  IF NOT public.rematricula_2027_rate_hit('find_cpf', 30, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  cpf_clean := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  IF length(cpf_clean) <> 11 THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    CASE 
      WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean THEN a.email_pai
      ELSE a.email_mae
    END,
    CASE 
      WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean THEN a.nome_pai
      ELSE a.nome_mae
    END
  FROM alunos_26 a
  WHERE regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = cpf_clean
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_alunos_by_cpf(p_cpf text)
 RETURNS TABLE(codigo_aluno text, nome_aluno text, curso text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cpf_clean text;
BEGIN
  IF NOT public.rematricula_2027_rate_hit('find_cpf', 30, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  cpf_clean := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  IF length(cpf_clean) <> 11 THEN RETURN; END IF;

  RETURN QUERY
  SELECT a.codigo_aluno, a.nome_aluno, a.curso
  FROM alunos_26 a
  WHERE regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = cpf_clean;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_alunos_by_email(p_email text)
 RETURNS TABLE(codigo_aluno text, nome_aluno text, curso text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.rematricula_2027_rate_hit('find_email', 30, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  IF position('@' in coalesce(p_email, '')) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT a.codigo_aluno, a.nome_aluno, a.curso
  FROM alunos_26 a
  WHERE lower(trim(a.email_pai)) = lower(trim(p_email))
     OR lower(trim(a.email_mae)) = lower(trim(p_email));
END;
$function$;
