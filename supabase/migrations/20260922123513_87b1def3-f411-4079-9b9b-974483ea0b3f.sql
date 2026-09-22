ALTER TABLE public.prematriculas
  ADD COLUMN IF NOT EXISTS followup_pausado boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.matricula_followup_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prematricula_id uuid NOT NULL REFERENCES public.prematriculas(id) ON DELETE CASCADE,
  etapa text NOT NULL,
  sequencia smallint NOT NULL DEFAULT 1,
  template text NOT NULL,
  destino text,
  sucesso boolean NOT NULL DEFAULT false,
  payload jsonb,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS matricula_followup_envios_unq
  ON public.matricula_followup_envios (prematricula_id, etapa, sequencia);

GRANT SELECT ON public.matricula_followup_envios TO authenticated;
GRANT ALL ON public.matricula_followup_envios TO service_role;

ALTER TABLE public.matricula_followup_envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff matricula le envios" ON public.matricula_followup_envios;
CREATE POLICY "staff matricula le envios"
ON public.matricula_followup_envios
FOR SELECT
TO authenticated
USING (public.has_setor(auth.uid(), 'matricula'));

CREATE OR REPLACE FUNCTION public.matricula_followup_listagem()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res jsonb;
BEGIN
  IF NOT public.has_setor(auth.uid(), 'matricula') THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_res
  FROM (
    SELECT
      pm.id,
      pm.protocolo,
      pm.token,
      pm.aluno_nome,
      pm.resp_nome,
      pm.resp_whatsapp,
      pm.resp_email,
      pm.serie_pretendida,
      pm.turno_preferencia,
      pm.status,
      pm.acompanhamento,
      pm.followup_pausado,
      pm.aprovado_em,
      pm.agendado_em,
      pm.entrevista_concluida_em,
      pm.created_at,
      pm.updated_at,
      ag.inicio AS entrevista_inicio,
      ag.status AS entrevista_status,
      m.id AS matricula_id,
      m.status AS matricula_status,
      m.contrato_gerado,
      m.contrato_assinado,
      m.acompanhamento AS matricula_acompanhamento,
      m.resp_fin_nome,
      m.resp_fin_celular,
      m.documentos_aprovados_em,
      m.updated_at AS matricula_updated_at,
      coalesce(v.restam_novos, 0) AS vagas_restantes,
      coalesce(v.lista_espera, true) AS sem_vaga,
      coalesce(e.envios, '[]'::jsonb) AS envios
    FROM public.prematriculas pm
    LEFT JOIN LATERAL (
      SELECT a.inicio, a.status
      FROM public.prematricula_agendamentos a
      WHERE a.prematricula_id = pm.id AND a.status = 'agendado'
      ORDER BY a.inicio DESC
      LIMIT 1
    ) ag ON true
    LEFT JOIN LATERAL (
      SELECT mm.*
      FROM public.matriculas mm
      WHERE mm.prematricula_id = pm.id
      ORDER BY mm.created_at DESC
      LIMIT 1
    ) m ON true
    LEFT JOIN LATERAL (
      SELECT t.restam_novos, t.lista_espera
      FROM public.prematricula_vagas_turnos(pm.serie_pretendida) t
      WHERE public.norm_turno(t.turno) = public.norm_turno(pm.turno_preferencia)
      LIMIT 1
    ) v ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'etapa', fe.etapa,
        'sequencia', fe.sequencia,
        'template', fe.template,
        'destino', fe.destino,
        'sucesso', fe.sucesso,
        'enviado_em', fe.enviado_em
      ) ORDER BY fe.enviado_em) AS envios
      FROM public.matricula_followup_envios fe
      WHERE fe.prematricula_id = pm.id
    ) e ON true
    WHERE pm.acompanhamento = 'ativo'
      AND pm.status IN (
        'aprovado_aguardando_agendamento',
        'entrevista_agendada',
        'entrevista_concluida'
      )
      AND (m.status IS NULL OR m.status <> 'concluida')
      AND (m.acompanhamento IS NULL OR m.acompanhamento = 'ativo')
  ) x;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.matricula_followup_listagem() FROM public;
GRANT EXECUTE ON FUNCTION public.matricula_followup_listagem() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.matricula_followup_pausar(_id uuid, _pausado boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_setor(auth.uid(), 'matricula') THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;
  UPDATE public.prematriculas SET followup_pausado = _pausado WHERE id = _id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.matricula_followup_pausar(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.matricula_followup_pausar(uuid, boolean) TO authenticated, service_role;