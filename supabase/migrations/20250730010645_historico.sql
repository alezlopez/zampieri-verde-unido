-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250730010645).

-- Adicionar coluna desconto na tabela pre_matricula
ALTER TABLE public.pre_matricula 
ADD COLUMN IF NOT EXISTS desconto text;
