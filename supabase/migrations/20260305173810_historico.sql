-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260305173810).

CREATE POLICY "Permitir leitura pública de conteudos_taredas"
ON public.conteudos_taredas
FOR SELECT
USING (true);
