-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250911022634).

-- Criar tabela para controlar vagas por curso e turno
CREATE TABLE public.vagas_turmas (
  id BIGSERIAL PRIMARY KEY,
  curso TEXT NOT NULL,
  turno TEXT NOT NULL,
  max_vagas INTEGER NOT NULL CHECK (max_vagas > 0),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(curso, turno)
);

-- Enable RLS
ALTER TABLE public.vagas_turmas ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admins)
CREATE POLICY "Administradores podem ver vagas" 
ON public.vagas_turmas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem inserir vagas" 
ON public.vagas_turmas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem atualizar vagas" 
ON public.vagas_turmas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores podem deletar vagas" 
ON public.vagas_turmas 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vagas_turmas_updated_at
BEFORE UPDATE ON public.vagas_turmas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate available spots
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
SET search_path = 'public'
AS $$
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
  LEFT JOIN public.rematricula r ON r."Curso 2026" = vt.curso AND r."Turno 2026" = vt.turno
  WHERE vt.ativo = true 
    AND (p_curso IS NULL OR vt.curso = p_curso)
    AND (p_turno IS NULL OR vt.turno = p_turno)
  GROUP BY vt.id, vt.curso, vt.turno, vt.max_vagas
  ORDER BY vt.curso, vt.turno;
END;
$$;

-- Create function to get all available spots
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
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.calcular_vagas_disponiveis(NULL, NULL);
END;
$$;
