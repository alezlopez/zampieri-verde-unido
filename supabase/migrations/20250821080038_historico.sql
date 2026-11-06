-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250821080038).

-- Criar políticas para a tabela ocorrencias
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública da tabela ocorrencias (similar às outras tabelas do projeto)
CREATE POLICY "Permitir leitura pública de ocorrencias" 
ON public.ocorrencias 
FOR SELECT 
USING (true);
