-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250911024348).

-- Corrigir a função calcular_vagas_disponiveis para contar apenas status 'Concluído'
CREATE OR REPLACE FUNCTION public.calcular_vagas_disponiveis(p_curso text, p_turno text)
 RETURNS TABLE(curso text, turno text, max_vagas integer, matriculados integer, vagas_disponiveis integer, disponivel boolean)
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
    AND r."Status" IN ('Concluído', 'Concluido')
  WHERE vt.ativo = true 
    AND (p_curso IS NULL OR vt.curso = p_curso)
    AND (p_turno IS NULL OR vt.turno = p_turno)
  GROUP BY vt.id, vt.curso, vt.turno, vt.max_vagas
  ORDER BY vt.curso, vt.turno;
END;
$function$;

-- Atualizar nomes dos cursos de Ensino Médio na tabela vagas_turmas
UPDATE public.vagas_turmas 
SET curso = '1º Médio' 
WHERE curso = '1º Ano EM';

UPDATE public.vagas_turmas 
SET curso = '2º Médio' 
WHERE curso = '2º Ano EM';

UPDATE public.vagas_turmas 
SET curso = '3º Médio' 
WHERE curso = '3º Ano EM';

-- Corrigir a função get_vagas_disponiveis para usar a função atualizada
CREATE OR REPLACE FUNCTION public.get_vagas_disponiveis()
 RETURNS TABLE(curso text, turno text, max_vagas integer, matriculados integer, vagas_disponiveis integer, disponivel boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.calcular_vagas_disponiveis(NULL, NULL);
END;
$function$;
