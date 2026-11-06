-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260306115614).

ALTER TABLE public.ocorrencias_mhund ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de ocorrencias"
  ON public.ocorrencias_mhund FOR SELECT USING (true);
