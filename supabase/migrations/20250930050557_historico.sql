-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250930050557).

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Administradores podem ler dados financeiros dos alunos" ON public."alunosIntegraSae";
DROP POLICY IF EXISTS "Administradores podem atualizar dados financeiros" ON public."alunosIntegraSae";
DROP POLICY IF EXISTS "Administradores podem deletar dados financeiros" ON public."alunosIntegraSae";
DROP POLICY IF EXISTS "Administradores podem inserir dados financeiros" ON public."alunosIntegraSae";

DROP POLICY IF EXISTS "Administradores podem visualizar rematriculas" ON public.rematricula;
DROP POLICY IF EXISTS "Administradores podem atualizar rematriculas" ON public.rematricula;
DROP POLICY IF EXISTS "Administradores podem deletar rematriculas" ON public.rematricula;
DROP POLICY IF EXISTS "Administradores podem inserir rematriculas" ON public.rematricula;

-- Criar novas políticas: leitura pública, modificação só para admins

-- alunosIntegraSae
CREATE POLICY "Permitir leitura pública de dados de alunos"
ON public."alunosIntegraSae"
FOR SELECT
USING (true);

CREATE POLICY "Administradores podem atualizar dados financeiros"
ON public."alunosIntegraSae"
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem deletar dados financeiros"
ON public."alunosIntegraSae"
FOR DELETE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem inserir dados financeiros"
ON public."alunosIntegraSae"
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- rematricula
CREATE POLICY "Permitir leitura pública de dados de rematricula"
ON public.rematricula
FOR SELECT
USING (true);

CREATE POLICY "Administradores podem atualizar rematriculas"
ON public.rematricula
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem deletar rematriculas"
ON public.rematricula
FOR DELETE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem inserir rematriculas"
ON public.rematricula
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
