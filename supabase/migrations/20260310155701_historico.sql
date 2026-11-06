-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260310155701).

CREATE POLICY "Permitir leitura pública de boletos_26"
ON public.boletos_26 FOR SELECT TO public USING (true);
