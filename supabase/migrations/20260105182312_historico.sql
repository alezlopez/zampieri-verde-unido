-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260105182312).

-- Habilitar RLS para a tabela alunnos_26
ALTER TABLE public.alunnos_26 ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública
CREATE POLICY "Permitir leitura pública de alunnos_26" 
ON public.alunnos_26 
FOR SELECT 
USING (true);
