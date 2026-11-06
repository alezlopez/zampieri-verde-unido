-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20251103135300).

-- Habilitar RLS na tabela alunos_comunicados_whatsapp
ALTER TABLE public.alunos_comunicados_whatsapp ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública
CREATE POLICY "Permitir leitura pública de alunos_comunicados_whatsapp"
ON public.alunos_comunicados_whatsapp
FOR SELECT
TO public
USING (true);
