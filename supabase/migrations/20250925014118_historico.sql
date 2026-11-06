-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250925014118).

-- Fix critical security vulnerability: Restrict access to alunosIntegraSae table
-- This table contains sensitive financial data (CPF, emails, WhatsApp, payment amounts)
-- and should only be accessible to authenticated administrators

-- Drop the current public access policy (using correct case-sensitive table name)
DROP POLICY IF EXISTS "Permitir leitura pública de alunos" ON public."alunosIntegraSae";

-- Create a new restrictive policy that only allows authenticated users to read
CREATE POLICY "Administradores podem ler dados financeiros dos alunos"
ON public."alunosIntegraSae"
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add policies for other operations that may be needed by administrators
CREATE POLICY "Administradores podem inserir dados financeiros"
ON public."alunosIntegraSae"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem atualizar dados financeiros"
ON public."alunosIntegraSae"
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem deletar dados financeiros"
ON public."alunosIntegraSae"
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);
