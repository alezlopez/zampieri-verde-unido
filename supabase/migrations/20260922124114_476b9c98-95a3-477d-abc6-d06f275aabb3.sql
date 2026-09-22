CREATE OR REPLACE FUNCTION public.matricula_followup_cron_lista()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
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
      pm.followup_pausado,
      pm.aprovado_em,
      pm.agendado_em,
      pm.entrevista_concluida_em,
      pm.created_at,
      pm.updated_at,
      ag.inicio AS entrevista_inicio,
      m.id AS matricula_id,
      m.status AS matricula_status,
      m.contrato_gerado,
      m.contrato_assinado,
      m.resp_fin_nome,
      m.resp_fin_celular,
      m.documentos_aprovados_em,
      m.updated_at AS matricula_updated_at,
      coalesce(v.restam_novos, 0) AS vagas_restantes,
      coalesce(v.lista_espera, true) AS sem_vaga,
      coalesce(e.envios, '[]'::jsonb) AS envios
    FROM public.prematriculas pm
    LEFT JOIN LATERAL (
      SELECT a.inicio
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
        'enviado_em', fe.enviado_em
      )) AS envios
      FROM public.matricula_followup_envios fe
      WHERE fe.prematricula_id = pm.id
    ) e ON true
    WHERE pm.acompanhamento = 'ativo'
      AND pm.followup_pausado = false
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

REVOKE ALL ON FUNCTION public.matricula_followup_cron_lista() FROM public;
GRANT EXECUTE ON FUNCTION public.matricula_followup_cron_lista() TO service_role;