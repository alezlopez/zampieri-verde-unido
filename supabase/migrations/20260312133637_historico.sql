-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260312133637).

CREATE POLICY "Permitir leitura pública de boletim_mensal_26"
  ON public.boletim_mensal_26
  FOR SELECT
  TO public
  USING (true);
