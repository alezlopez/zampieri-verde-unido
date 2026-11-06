-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250819054859).

-- Adicionar novas colunas na tabela rematricula
ALTER TABLE public.rematricula 
ADD COLUMN "RG Resp. Financeiro" text,
ADD COLUMN "Profissão Resp. Financeiro" text,
ADD COLUMN "Data Nascimento Resp. Financeiro" text,
ADD COLUMN "Data Nascimento Aluno" text,
ADD COLUMN "Estado Civil Resp. Financeiro" text;
