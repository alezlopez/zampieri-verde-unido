-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250819023425).


-- Função para buscar rematrícula por CPF em ambas as colunas, normalizando para dígitos
create or replace function public.rematricula_by_cpf(p_cpf text)
returns setof public.rematricula
language sql
security definer
set search_path to public
as $$
  select *
  from public.rematricula
  where regexp_replace(coalesce("CPF do Pai", ''), '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g')
     or regexp_replace(coalesce("CPF da mãe", ''), '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
$$;

-- Garantir permissão de execução para clientes web
grant execute on function public.rematricula_by_cpf(text) to anon, authenticated;
