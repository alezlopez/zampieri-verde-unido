-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260430121909).

UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;
