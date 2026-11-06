-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250821021225).

-- Primeiro, remover a política genérica anterior
DROP POLICY IF EXISTS "Permitir atualização de status para admin" ON public.rematricula;

-- Habilitar RLS na tabela rematricula
ALTER TABLE public.rematricula ENABLE ROW LEVEL SECURITY;

-- Criar políticas mais específicas para usuários autenticados
CREATE POLICY "Administradores podem visualizar rematriculas" 
ON public.rematricula 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem atualizar rematriculas" 
ON public.rematricula 
FOR UPDATE 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);
