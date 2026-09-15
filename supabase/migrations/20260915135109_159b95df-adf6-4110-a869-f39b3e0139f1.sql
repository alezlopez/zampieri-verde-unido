CREATE TABLE public.rematricula_2027_intencao (
  id_aluno bigint PRIMARY KEY REFERENCES public.alunos_rematricula_2027(id_aluno) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sem_resposta',
  motivo text,
  motivo_texto text,
  respondido_em timestamptz,
  origem text,
  destino text,
  pausado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rematricula_2027_intencao TO authenticated;
GRANT ALL ON public.rematricula_2027_intencao TO service_role;
ALTER TABLE public.rematricula_2027_intencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intencao_staff_read" ON public.rematricula_2027_intencao
  FOR SELECT TO authenticated USING (public.has_setor(auth.uid(), 'rematricula'));

CREATE OR REPLACE FUNCTION public.rematricula_2027_intencao_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('sem_resposta','vai_rematricular','indeciso','nao_vai') THEN
    RAISE EXCEPTION 'status inválido: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rematricula_2027_intencao_valida
BEFORE INSERT OR UPDATE ON public.rematricula_2027_intencao
FOR EACH ROW EXECUTE FUNCTION public.rematricula_2027_intencao_valida();

CREATE TABLE public.rematricula_2027_intencao_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_aluno bigint NOT NULL REFERENCES public.alunos_rematricula_2027(id_aluno) ON DELETE CASCADE,
  tipo text NOT NULL,
  sequencia smallint NOT NULL DEFAULT 1,
  template text NOT NULL,
  destino text,
  sucesso boolean NOT NULL DEFAULT false,
  payload jsonb,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_aluno, tipo, sequencia)
);

GRANT SELECT ON public.rematricula_2027_intencao_envios TO authenticated;
GRANT ALL ON public.rematricula_2027_intencao_envios TO service_role;
ALTER TABLE public.rematricula_2027_intencao_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intencao_envios_staff_read" ON public.rematricula_2027_intencao_envios
  FOR SELECT TO authenticated USING (public.has_setor(auth.uid(), 'rematricula'));

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_intencao_listagem()
RETURNS TABLE (
  id_aluno bigint,
  nome_aluno text,
  curso_atual text,
  curso_2027 text,
  responsavel_financeiro text,
  nome_pai text,
  celular_pai text,
  email_pai text,
  nome_mae text,
  celular_mae text,
  email_mae text,
  contrato_gerado boolean,
  contrato_assinado boolean,
  rematricula_concluida boolean,
  cancelada boolean,
  status text,
  motivo text,
  motivo_texto text,
  respondido_em timestamptz,
  pausado boolean,
  envios jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.id_aluno, a.nome_aluno, a.curso_atual, a.curso_2027, a.responsavel_financeiro,
    a.nome_pai, COALESCE(a.celular_pai, a.telefone_pai), a.email_pai,
    a.nome_mae, COALESCE(a.celular_mae, a.telefone_mae), a.email_mae,
    COALESCE(a.contrato_gerado,false), COALESCE(a.contrato_assinado,false),
    COALESCE(a.rematricula_concluida,false), COALESCE(a.cancelada,false),
    COALESCE(i.status,'sem_resposta'), i.motivo, i.motivo_texto, i.respondido_em,
    COALESCE(i.pausado,false),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'tipo', e.tipo, 'sequencia', e.sequencia, 'template', e.template,
        'destino', e.destino, 'sucesso', e.sucesso, 'enviado_em', e.enviado_em
      ) ORDER BY e.enviado_em)
      FROM public.rematricula_2027_intencao_envios e WHERE e.id_aluno = a.id_aluno
    ), '[]'::jsonb)
  FROM public.alunos_rematricula_2027 a
  LEFT JOIN public.rematricula_2027_intencao i ON i.id_aluno = a.id_aluno
  WHERE public.has_setor(auth.uid(), 'rematricula')
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_admin_intencao_listagem() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_intencao_listagem() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_intencao_pausar(_id_aluno bigint, _pausado boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.rematricula_2027_intencao (id_aluno, pausado)
  VALUES (_id_aluno, _pausado)
  ON CONFLICT (id_aluno) DO UPDATE SET pausado = EXCLUDED.pausado;
END;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_admin_intencao_pausar(bigint, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_admin_intencao_pausar(bigint, boolean) TO authenticated, service_role;