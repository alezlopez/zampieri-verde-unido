CREATE TABLE IF NOT EXISTS public.lista_espera_2027 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prematricula_id uuid REFERENCES public.prematriculas(id) ON DELETE CASCADE,
  aluno_nome text NOT NULL,
  resp_nome text,
  resp_whatsapp text,
  resp_email text,
  serie text NOT NULL,
  curso_2027 text,
  turno text NOT NULL,
  status text NOT NULL DEFAULT 'aguardando',
  motivo text,
  convocado_em timestamptz,
  convocado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lista_espera_2027_prematricula_uk
  ON public.lista_espera_2027 (prematricula_id)
  WHERE prematricula_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lista_espera_2027 TO authenticated;
GRANT ALL ON public.lista_espera_2027 TO service_role;

ALTER TABLE public.lista_espera_2027 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lista_espera_2027_matricula_gerencia" ON public.lista_espera_2027;
CREATE POLICY "lista_espera_2027_matricula_gerencia"
  ON public.lista_espera_2027 FOR ALL
  TO authenticated
  USING (public.has_setor(auth.uid(), 'matricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

CREATE OR REPLACE FUNCTION public.lista_espera_2027_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lista_espera_2027_touch ON public.lista_espera_2027;
CREATE TRIGGER trg_lista_espera_2027_touch
  BEFORE UPDATE ON public.lista_espera_2027
  FOR EACH ROW EXECUTE FUNCTION public.lista_espera_2027_touch();

-- Aviso para a secretaria quando alguém entra na fila
CREATE OR REPLACE FUNCTION public.lista_espera_2027_notificar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.notificar_admin(
    'matricula',
    'lista_espera',
    'Nova família na lista de espera',
    NEW.aluno_nome || ' — ' || NEW.serie || ' (' || NEW.turno || ')',
    '/admin/prematriculas',
    NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lista_espera_2027_notificar ON public.lista_espera_2027;
CREATE TRIGGER trg_lista_espera_2027_notificar
  AFTER INSERT ON public.lista_espera_2027
  FOR EACH ROW EXECUTE FUNCTION public.lista_espera_2027_notificar();

-- Disponibilidade por turno para a pré-matrícula (aluno novo)
CREATE OR REPLACE FUNCTION public.prematricula_vagas_turnos(p_serie text)
RETURNS TABLE(
  turno text,
  matricula_habilitada boolean,
  vagas_novos integer,
  usadas_novos integer,
  restam_novos integer,
  lista_espera boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_curso text := public.curso_2027_por_serie(p_serie);
BEGIN
  IF v_curso IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    vt.turno,
    vt.matricula_habilitada,
    vt.vagas_novos,
    coalesce(oc.matr, 0)::integer,
    LEAST(
      GREATEST(vt.vagas_novos - coalesce(oc.matr, 0), 0),
      GREATEST(vt.max_vagas - coalesce(oc.remat, 0) - coalesce(oc.matr, 0), 0)
    )::integer,
    NOT (
      vt.matricula_habilitada
      AND LEAST(
        GREATEST(vt.vagas_novos - coalesce(oc.matr, 0), 0),
        GREATEST(vt.max_vagas - coalesce(oc.remat, 0) - coalesce(oc.matr, 0), 0)
      ) > 0
    )
  FROM public.vagas_2027 vt
  LEFT JOIN public.vagas_2027_ocupacao() oc
    ON oc.curso_2027 = vt.curso_2027 AND oc.turno = public.norm_turno(vt.turno)
  WHERE vt.ativo = true AND vt.curso_2027 = v_curso
  ORDER BY vt.turno;
END;
$$;

REVOKE ALL ON FUNCTION public.prematricula_vagas_turnos(text) FROM public;
GRANT EXECUTE ON FUNCTION public.prematricula_vagas_turnos(text) TO anon, authenticated, service_role;
