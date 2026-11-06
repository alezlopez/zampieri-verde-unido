-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250725085154).

-- Corrigir a função para ter search_path seguro
CREATE OR REPLACE FUNCTION public.authenticate_with_username(
  p_username TEXT,
  p_password TEXT
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_uuid UUID;
BEGIN
  -- Buscar email do usuário pelo username
  SELECT u.email, u.id INTO user_email, user_uuid
  FROM auth.users u
  JOIN public.user_profiles p ON u.id = p.user_id
  WHERE p.username = p_username;
  
  IF user_email IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Usuário não encontrado';
    RETURN;
  END IF;
  
  -- Retornar dados para autenticação no frontend
  RETURN QUERY SELECT user_uuid, user_email, TRUE, 'Usuário encontrado';
END;
$$;
