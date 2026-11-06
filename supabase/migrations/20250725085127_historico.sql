-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250725085127).

-- Criar tabela de perfis de usuário para mapear username para auth.users
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de usernames para autenticação
CREATE POLICY "Permitir leitura de usernames para autenticação" 
ON public.user_profiles 
FOR SELECT 
USING (true);

-- Função para autenticação por username
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
