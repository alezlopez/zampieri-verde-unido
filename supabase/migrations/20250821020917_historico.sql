-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250821020917).

-- Permitir atualização de status na tabela rematricula
CREATE POLICY "Permitir atualização de status para admin" 
ON public.rematricula 
FOR UPDATE 
USING (true) 
WITH CHECK (true);
