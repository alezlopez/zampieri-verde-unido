-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250911034524).

-- Atualiza regra de cálculo de matriculados para considerar Status concluído e/ou pagamento
CREATE OR REPLACE FUNCTION public.calcular_vagas_disponiveis(p_curso text, p_turno text)
RETURNS TABLE(
  curso text,
  turno text,
  max_vagas integer,
  matriculados integer,
  vagas_disponiveis integer,
  disponivel boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    vt.curso,
    vt.turno,
    vt.max_vagas,
    COUNT(DISTINCT CASE 
      WHEN (
        r."Status" IN ('Concluído', 'Concluido')
        OR EXISTS (
          SELECT 1 
          FROM public.alunosIntegraSae a 
          WHERE a.codigo_aluno = r."Cod Aluno" 
            AND a.pago = true
        )
      ) THEN r."Cod Aluno" 
      ELSE NULL 
    END)::integer AS matriculados,
    (vt.max_vagas - COUNT(DISTINCT CASE 
      WHEN (
        r."Status" IN ('Concluído', 'Concluido')
        OR EXISTS (
          SELECT 1 
          FROM public.alunosIntegraSae a 
          WHERE a.codigo_aluno = r."Cod Aluno" 
            AND a.pago = true
        )
      ) THEN r."Cod Aluno" 
      ELSE NULL 
    END)::integer)::integer AS vagas_disponiveis,
    (vt.max_vagas > COUNT(DISTINCT CASE 
      WHEN (
        r."Status" IN ('Concluído', 'Concluido')
        OR EXISTS (
          SELECT 1 
          FROM public.alunosIntegraSae a 
          WHERE a.codigo_aluno = r."Cod Aluno" 
            AND a.pago = true
        )
      ) THEN r."Cod Aluno" 
      ELSE NULL 
    END)::integer) AS disponivel
  FROM public.vagas_turmas vt
  LEFT JOIN public.rematricula r 
    ON r."Curso 2026" = vt.curso 
   AND r."Turno 2026" = vt.turno
  WHERE vt.ativo = true
    AND (p_curso IS NULL OR vt.curso = p_curso)
    AND (p_turno IS NULL OR vt.turno = p_turno)
  GROUP BY vt.id, vt.curso, vt.turno, vt.max_vagas
  ORDER BY vt.curso, vt.turno;
END;
$function$;

-- Garante que get_vagas_disponiveis continue refletindo a função atualizada
CREATE OR REPLACE FUNCTION public.get_vagas_disponiveis()
RETURNS TABLE(
  curso text,
  turno text,
  max_vagas integer,
  matriculados integer,
  vagas_disponiveis integer,
  disponivel boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.calcular_vagas_disponiveis(NULL, NULL);
END;
$function$;
