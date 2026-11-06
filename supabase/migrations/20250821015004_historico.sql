-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250821015004).

-- Permitir leitura pública da tabela numeros_da_sorte
CREATE POLICY "Permitir leitura pública dos números da sorte" 
ON public.numeros_da_sorte 
FOR SELECT 
USING (true);
