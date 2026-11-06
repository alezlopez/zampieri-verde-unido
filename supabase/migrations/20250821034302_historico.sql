-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250821034302).


-- Função para obter dados de rematrícula por Código do Aluno
-- Retorna campos do Pai e da Mãe para pré-preenchimento do formulário.
-- SECURITY DEFINER para contornar RLS com segurança, filtrando por código.
create or replace function public.rematricula_by_codigo_aluno(p_cod_aluno bigint)
returns table(
  "Cod Aluno" bigint,
  "Nome do Aluno" text,
  "Nome do Pai" text,
  "Nome da mãe" text,
  "Email do Pai" text,
  "Email da Mãe" text,
  "Telefone do Pai" text,
  "Telefone da Mãe" text,
  "CPF do Pai" text,
  "CPF da mãe" text
)
language plpgsql
security definer
set search_path to public
as $$
begin
  return query
  select
    r."Cod Aluno",
    r."Nome do Aluno",
    r."Nome do Pai",
    r."Nome da mãe",
    r."Email do Pai",
    r."Email da Mãe",
    r."Telefone do Pai",
    r."Telefone da Mãe",
    r."CPF do Pai",
    r."CPF da mãe"
  from public.rematricula r
  where r."Cod Aluno" = p_cod_aluno
  limit 1;
end;
$$;
