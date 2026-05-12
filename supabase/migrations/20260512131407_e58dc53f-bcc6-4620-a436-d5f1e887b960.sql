
-- RPC to find user_id by CPF (looks up email via alunos_26 then auth.users)
CREATE OR REPLACE FUNCTION public.find_user_id_by_cpf(p_cpf text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_clean text;
  v_email text;
  v_user_id uuid;
BEGIN
  cpf_clean := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  IF cpf_clean = '' THEN RETURN NULL; END IF;

  SELECT CASE 
    WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean THEN a.email_pai
    ELSE a.email_mae
  END INTO v_email
  FROM alunos_26 a
  WHERE regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = cpf_clean
  LIMIT 1;

  IF v_email IS NULL OR v_email = '' THEN RETURN NULL; END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(v_email)) LIMIT 1;
  RETURN v_user_id;
END;
$$;

-- Allow admins to insert tickets for any user
CREATE POLICY "Admins can create any tickets"
ON public.ingressos
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
