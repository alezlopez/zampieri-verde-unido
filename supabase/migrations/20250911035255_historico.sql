-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250911035255).

-- Corrige a função para considerar apenas Status na tabela rematricula
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
    COALESCE(COUNT(r."Cod Aluno"), 0)::integer as matriculados,
    (vt.max_vagas - COALESCE(COUNT(r."Cod Aluno"), 0))::integer as vagas_disponiveis,
    (vt.max_vagas > COALESCE(COUNT(r."Cod Aluno"), 0)) as disponivel
  FROM public.vagas_turmas vt
  LEFT JOIN public.rematricula r ON r."Curso 2026" = vt.curso 
    AND r."Turno 2026" = vt.turno 
    AND r."Status" IN ('Concluído', 'Concluido', 'Pago')
  WHERE vt.ativo = true 
    AND (p_curso IS NULL OR vt.curso = p_curso)
    AND (p_turno IS NULL OR vt.turno = p_turno)
  GROUP BY vt.id, vt.curso, vt.turno, vt.max_vagas
  ORDER BY vt.curso, vt.turno;
END;
$function$;
