-- Quem está comprando ingresso: responsável de aluno (pode comprar eventos "só para alunos") ou externo.
-- Antes, qualquer conta com cadastro em compradores_externos era tratada como externa, mesmo quando o CPF
-- era de pai/mãe no cadastro de alunos (o login empurrava para o cadastro de externo quem estava sem e-mail).
-- Agora: CPF da conta (metadado) ou CPF do cadastro de externo presente em alunos_26 = responsável.

CREATE OR REPLACE FUNCTION public.perfil_comprador()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cpf_conta text;
  v_cpf_externo text;
  v_externo boolean;
  v_cpf_resp text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('tipo', NULL);
  END IF;

  SELECT regexp_replace(coalesce(u.raw_user_meta_data->>'cpf', ''), '\D', '', 'g') INTO v_cpf_conta
  FROM auth.users u WHERE u.id = v_uid;
  SELECT regexp_replace(coalesce(ce.cpf, ''), '\D', '', 'g'), true INTO v_cpf_externo, v_externo
  FROM public.compradores_externos ce WHERE ce.user_id = v_uid LIMIT 1;

  SELECT c INTO v_cpf_resp
  FROM unnest(ARRAY[v_cpf_conta, v_cpf_externo]) AS c
  WHERE length(c) = 11 AND EXISTS (
    SELECT 1 FROM public.alunos_26 a
    WHERE regexp_replace(coalesce(a.cpf_mae, ''), '\D', '', 'g') = c
       OR regexp_replace(coalesce(a.cpf_pai, ''), '\D', '', 'g') = c
  )
  LIMIT 1;

  RETURN jsonb_build_object(
    'tipo', CASE WHEN v_cpf_resp IS NOT NULL THEN 'responsavel' WHEN coalesce(v_externo, false) THEN 'externo' ELSE 'aluno' END,
    'cpf_responsavel', v_cpf_resp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.perfil_comprador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfil_comprador() TO authenticated;

-- Login por CPF: diz se o CPF é de responsável de aluno mesmo quando falta o e-mail no cadastro,
-- para o site orientar a falar com a secretaria em vez de oferecer o cadastro de comprador externo.
CREATE OR REPLACE FUNCTION public.cpf_responsavel_sem_email(p_cpf text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
BEGIN
  -- Mesmo limite de tentativas da busca de e-mail por CPF do login (evita varredura de CPFs)
  IF NOT public.rematricula_2027_rate_hit('find_cpf', 30, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;
  IF length(v_cpf) <> 11 THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
      SELECT 1 FROM public.alunos_26 a
      WHERE (regexp_replace(coalesce(a.cpf_mae, ''), '\D', '', 'g') = v_cpf AND coalesce(trim(a.email_mae), '') = '')
         OR (regexp_replace(coalesce(a.cpf_pai, ''), '\D', '', 'g') = v_cpf AND coalesce(trim(a.email_pai), '') = '')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.alunos_26 a
      WHERE (regexp_replace(coalesce(a.cpf_mae, ''), '\D', '', 'g') = v_cpf AND coalesce(trim(a.email_mae), '') <> '')
         OR (regexp_replace(coalesce(a.cpf_pai, ''), '\D', '', 'g') = v_cpf AND coalesce(trim(a.email_pai), '') <> '')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cpf_responsavel_sem_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cpf_responsavel_sem_email(text) TO anon, authenticated;
