-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250716014238).

-- Habilitar RLS na tabela alunosIntegraSae
ALTER TABLE public."alunosIntegraSae" ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura pública da tabela alunosIntegraSae
CREATE POLICY "Permitir leitura pública de alunos" 
ON public."alunosIntegraSae" 
FOR SELECT 
USING (true);
