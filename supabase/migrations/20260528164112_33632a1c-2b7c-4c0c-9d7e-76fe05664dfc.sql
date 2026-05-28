CREATE OR REPLACE FUNCTION public.get_comprador_dados(p_user_id uuid)
RETURNS TABLE(origem text, nome text, cpf text, email text, celular text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_meta_cpf text;
  v_meta_nome text;
BEGIN
  SELECT
    u.email,
    regexp_replace(COALESCE(u.raw_user_meta_data->>'cpf', ''), '[^0-9]', '', 'g'),
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'nome', '')), '')
  INTO v_email, v_meta_cpf, v_meta_nome
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  -- Prioriza dados escolares quando o usuário entrou pelo CPF vinculado ao aluno/responsável.
  -- Isso evita usar um cadastro externo antigo com CPF divergente para gerar cobrança no Asaas.
  RETURN QUERY
  SELECT
    'aluno'::text,
    COALESCE(
      CASE
        WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = v_meta_cpf
          OR lower(trim(a.email_pai)) = lower(trim(v_email))
        THEN a.nome_pai
        ELSE NULL
      END,
      CASE
        WHEN regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = v_meta_cpf
          OR lower(trim(a.email_mae)) = lower(trim(v_email))
        THEN a.nome_mae
        ELSE NULL
      END,
      v_meta_nome
    ) AS nome,
    COALESCE(
      NULLIF(v_meta_cpf, ''),
      CASE
        WHEN lower(trim(a.email_pai)) = lower(trim(v_email))
        THEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g')
        ELSE NULL
      END,
      CASE
        WHEN lower(trim(a.email_mae)) = lower(trim(v_email))
        THEN regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g')
        ELSE NULL
      END
    ) AS cpf,
    v_email AS email,
    COALESCE(
      CASE
        WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = v_meta_cpf
          OR lower(trim(a.email_pai)) = lower(trim(v_email))
        THEN a.celular_pai
        ELSE NULL
      END,
      CASE
        WHEN regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = v_meta_cpf
          OR lower(trim(a.email_mae)) = lower(trim(v_email))
        THEN a.telefone_mae
        ELSE NULL
      END
    ) AS celular
  FROM alunos_26 a
  WHERE (
    NULLIF(v_meta_cpf, '') IS NOT NULL
    AND (
      regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = v_meta_cpf
      OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = v_meta_cpf
    )
  )
  OR lower(trim(a.email_pai)) = lower(trim(v_email))
  OR lower(trim(a.email_mae)) = lower(trim(v_email))
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Fallback seguro para usuários externos sem vínculo escolar.
  RETURN QUERY
  SELECT 'externo'::text, c.nome, c.cpf, c.email, c.celular
  FROM compradores_externos c
  WHERE c.user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Último fallback: dados autenticados do usuário.
  IF NULLIF(v_meta_cpf, '') IS NOT NULL AND v_meta_nome IS NOT NULL THEN
    RETURN QUERY SELECT 'auth'::text, v_meta_nome, v_meta_cpf, v_email, NULL::text;
  END IF;
END;
$$;