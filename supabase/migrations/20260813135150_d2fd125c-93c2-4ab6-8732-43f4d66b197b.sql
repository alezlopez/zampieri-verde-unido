CREATE OR REPLACE FUNCTION public.rematricula_2027_numeros_publicos()
RETURNS TABLE (numero text, nome_mascarado text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.numero,
         (
           SELECT string_agg(
                    CASE
                      WHEN ord = 1 THEN initcap(p)
                      WHEN lower(p) IN ('da','de','do','das','dos','e') THEN lower(p)
                      ELSE upper(left(p, 1)) || '.'
                    END, ' ' ORDER BY ord
                  )
           FROM unnest(regexp_split_to_array(btrim(a.nome_aluno), '\s+')) WITH ORDINALITY AS t(p, ord)
         ) AS nome_mascarado
  FROM public.rematricula_2027_numeros_sorte n
  JOIN public.alunos_rematricula_2027 a ON a.id_aluno = n.id_aluno
  ORDER BY n.numero;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_numeros_publicos() FROM public;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_numeros_publicos() TO anon, authenticated, service_role;