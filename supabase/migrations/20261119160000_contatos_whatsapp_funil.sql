-- Interessados que só conversaram no WhatsApp (WhatsZampieri) entram no funil de famílias do site.
-- O WhatsZampieri envia o contato para a edge function lead-whatsapp quando ele vira "Interessado".

CREATE TABLE public.contatos_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  telefone text NOT NULL,
  nome text,
  -- Origem registrada no WhatsZampieri: ctwa_ad (anúncio de clique para WhatsApp), link (código ref),
  -- triage (escolheu o Comercial no menu), manual (marcado pelo atendente)
  origem text,
  origem_detalhe jsonb,
  contato_id text,
  etapa_whatsapp text,
  motivo_perda text,
  primeiro_contato timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER contatos_whatsapp_updated BEFORE UPDATE ON public.contatos_whatsapp FOR EACH ROW EXECUTE FUNCTION public.tocar_updated_at();

ALTER TABLE public.contatos_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY contatos_whatsapp_equipe ON public.contatos_whatsapp FOR SELECT TO authenticated
  USING (public.has_setor(auth.uid(), 'matricula'));
REVOKE ALL ON public.contatos_whatsapp FROM anon;
GRANT SELECT ON public.contatos_whatsapp TO authenticated;

-- O WhatsZampieri se autentica com o mesmo token que o site usa para chamá-lo (LEAD_CALLBACK_TOKEN,
-- guardado aqui no Vault como whatszampieri_lead_token). Só a edge function (service role) consulta.
CREATE OR REPLACE FUNCTION public.token_whatszampieri_ok(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT coalesce(length(p_token) >= 16, false) AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'whatszampieri_lead_token' AND decrypted_secret = p_token
  );
$$;
REVOKE ALL ON FUNCTION public.token_whatszampieri_ok(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.token_whatszampieri_ok(text) TO service_role;

CREATE OR REPLACE FUNCTION public.funil_familias(p_desde timestamptz DEFAULT NULL)
RETURNS TABLE (
  chave text,
  telefone text,
  responsavel text,
  alunos text,
  serie text,
  turno text,
  primeiro_contato timestamptz,
  entrada text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  tem_fbclid boolean,
  tem_gclid boolean,
  como_conheceu text,
  etapa text,
  etapa_ordem integer,
  motivo_perda text,
  perda_manual boolean,
  lista_espera boolean,
  visita_inicio timestamptz,
  visita_status text,
  protocolos text,
  lead_ids uuid[],
  tem_pre boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_setor(auth.uid(), 'matricula') THEN
    RAISE EXCEPTION 'sem_permissao' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH
  l AS (
    SELECT ls.*, public.chave_telefone(ls.whatsapp) AS k FROM public.leads_site ls
  ),
  p AS (
    SELECT pm.id, pm.protocolo, pm.resp_nome, pm.resp_whatsapp, pm.aluno_nome, pm.serie_pretendida,
           pm.turno_preferencia, pm.created_at, pm.utm_source, pm.utm_medium, pm.utm_campaign, pm.utm_content,
           pm.utm_term, pm.fbclid, pm.gclid, pm.como_conheceu,
           public.chave_telefone(pm.resp_whatsapp) AS k,
           CASE
             WHEN m.status IS NOT NULL AND coalesce(m.acompanhamento, 'ativo') IN ('cancelado', 'desistente') THEN 'perdido'
             WHEN m.status = 'concluida' OR m.contrato_assinado THEN 'matriculado'
             WHEN m.status IN ('documentos_aprovados', 'contrato_gerado') OR m.contrato_gerado THEN 'contrato'
             WHEN m.status IS NOT NULL THEN 'documentos'
             WHEN pm.status = 'reprovado' OR coalesce(pm.acompanhamento, 'ativo') IN ('cancelado', 'desistente') THEN 'perdido'
             WHEN pm.status = 'entrevista_concluida' THEN 'documentos'
             WHEN pm.status IN ('entrevista_agendada', 'aprovado_aguardando_agendamento', 'aprovado_com_ressalvas') THEN 'aprovada'
             ELSE 'pre_matricula'
           END AS etapa_filho,
           coalesce(m.acompanhamento_motivo, pm.acompanhamento_motivo, pm.motivo_texto, pm.motivo_reprovacao) AS motivo,
           EXISTS (SELECT 1 FROM public.lista_espera_2027 le WHERE le.prematricula_id = pm.id AND le.status = 'aguardando') AS espera
    FROM public.prematriculas pm
    LEFT JOIN LATERAL (
      SELECT mt.status, mt.contrato_gerado, mt.contrato_assinado, mt.acompanhamento, mt.acompanhamento_motivo
      FROM public.matriculas mt WHERE mt.prematricula_id = pm.id ORDER BY mt.created_at DESC LIMIT 1
    ) m ON true
  ),
  -- Interessados do WhatsZampieri (conversa no WhatsApp, sem formulário)
  w AS (
    SELECT cw.*, cw.chave AS k FROM public.contatos_whatsapp cw
  ),
  ordem (etapa_nome, n) AS (
    VALUES ('perdido', 0), ('interessado', 1), ('visita_agendada', 2), ('visita_faltou', 2), ('visita_realizada', 3),
           ('pre_matricula', 4), ('aprovada', 5), ('documentos', 6), ('contrato', 7), ('matriculado', 8)
  ),
  chaves AS (
    SELECT k FROM l WHERE k IS NOT NULL UNION SELECT k FROM p WHERE k IS NOT NULL UNION SELECT k FROM w
  ),
  fam AS (
    SELECT
      c.k,
      (SELECT min(t) FROM (SELECT l.created_at AS t FROM l WHERE l.k = c.k UNION ALL SELECT p.created_at FROM p WHERE p.k = c.k
                            UNION ALL SELECT w.primeiro_contato FROM w WHERE w.k = c.k) x) AS primeiro,
      (SELECT min(w.primeiro_contato) FROM w WHERE w.k = c.k) AS primeiro_wa,
      EXISTS (SELECT 1 FROM w WHERE w.k = c.k AND w.etapa_whatsapp = 'lost') AS perdido_wa,
      (SELECT min(l.created_at) FROM l WHERE l.k = c.k) AS primeiro_lead,
      (SELECT min(p.created_at) FROM p WHERE p.k = c.k) AS primeiro_pre,
      EXISTS (SELECT 1 FROM p WHERE p.k = c.k) AS tem_pre,
      (SELECT p.etapa_filho FROM p JOIN ordem o ON o.etapa_nome = p.etapa_filho
        WHERE p.k = c.k AND p.etapa_filho <> 'perdido' ORDER BY o.n DESC LIMIT 1) AS melhor_pre,
      EXISTS (SELECT 1 FROM l WHERE l.k = c.k) AND NOT EXISTS (SELECT 1 FROM l WHERE l.k = c.k AND l.status <> 'perdido') AS leads_perdidos,
      (SELECT v.inicio FROM public.visitas v JOIN l ON l.id = v.lead_id WHERE l.k = c.k AND v.status <> 'cancelada' ORDER BY v.inicio DESC LIMIT 1) AS v_inicio,
      (SELECT v.status FROM public.visitas v JOIN l ON l.id = v.lead_id WHERE l.k = c.k AND v.status <> 'cancelada' ORDER BY v.inicio DESC LIMIT 1) AS v_status
    FROM chaves c
  ),
  calc AS (
    SELECT f.*,
      CASE
        WHEN f.tem_pre THEN coalesce(f.melhor_pre, 'perdido')
        WHEN f.leads_perdidos THEN 'perdido'
        WHEN f.v_status = 'realizada' THEN 'visita_realizada'
        WHEN f.v_status = 'faltou' THEN 'visita_faltou'
        WHEN f.v_status = 'agendada' THEN 'visita_agendada'
        WHEN f.perdido_wa THEN 'perdido'
        ELSE 'interessado'
      END AS etapa_final
    FROM fam f
    WHERE p_desde IS NULL OR f.primeiro >= p_desde
  )
  SELECT
    c.k,
    coalesce((SELECT l.whatsapp FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1),
             (SELECT regexp_replace(p.resp_whatsapp, '\D', '', 'g') FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1),
             (SELECT w.telefone FROM w WHERE w.k = c.k LIMIT 1)),
    coalesce((SELECT p.resp_nome FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1),
             (SELECT l.nome FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1),
             (SELECT w.nome FROM w WHERE w.k = c.k LIMIT 1)),
    (SELECT string_agg(DISTINCT p.aluno_nome, ', ') FROM p WHERE p.k = c.k),
    coalesce((SELECT string_agg(DISTINCT p.serie_pretendida, ', ') FROM p WHERE p.k = c.k),
             (SELECT l.serie FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1)),
    coalesce((SELECT p.turno_preferencia FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1),
             (SELECT l.turno FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1)),
    c.primeiro,
    CASE
      WHEN c.primeiro_wa IS NOT NULL AND c.primeiro_wa <= coalesce(c.primeiro_lead, 'infinity') AND c.primeiro_wa <= coalesce(c.primeiro_pre, 'infinity')
        THEN 'whatsapp_conversa'
      WHEN c.primeiro_lead IS NOT NULL AND (c.primeiro_pre IS NULL OR c.primeiro_lead <= c.primeiro_pre)
        THEN (SELECT l.origem FROM l WHERE l.k = c.k ORDER BY l.created_at LIMIT 1)
      ELSE 'pre_direta'
    END,
    -- Origem: registro mais antigo da família com alguma pista (ver LATERAL og abaixo)
    og.utm_source,
    og.utm_medium,
    og.utm_campaign,
    og.utm_content,
    og.utm_term,
    coalesce(og.tem_fbclid, false),
    coalesce(og.tem_gclid, false),
    (SELECT p.como_conheceu FROM p WHERE p.k = c.k AND p.como_conheceu IS NOT NULL ORDER BY p.created_at DESC LIMIT 1),
    c.etapa_final,
    (SELECT o.n FROM ordem o WHERE o.etapa_nome = c.etapa_final),
    CASE WHEN c.etapa_final = 'perdido' THEN
      coalesce((SELECT p.motivo FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1),
               (SELECT l.observacao FROM l WHERE l.k = c.k AND l.observacao IS NOT NULL ORDER BY l.updated_at DESC LIMIT 1),
               (SELECT w.motivo_perda FROM w WHERE w.k = c.k LIMIT 1))
    END,
    (NOT c.tem_pre AND c.leads_perdidos),
    coalesce((SELECT bool_or(p.espera) FROM p WHERE p.k = c.k), false),
    c.v_inicio,
    c.v_status,
    (SELECT string_agg(p.protocolo, ', ' ORDER BY p.created_at) FROM p WHERE p.k = c.k),
    coalesce((SELECT array_agg(l.id ORDER BY l.created_at) FROM l WHERE l.k = c.k), ARRAY[]::uuid[]),
    c.tem_pre
  FROM calc c
  -- Origem da família: o registro mais antigo que trouxe alguma pista (lead do site, pré-matrícula
  -- ou contato do WhatsApp, onde anúncio de clique para WhatsApp vira utm_medium=ctwa)
  LEFT JOIN LATERAL (
    SELECT * FROM (
      SELECT l.created_at AS t, l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content, l.utm_term,
             (l.fbclid IS NOT NULL OR l.fbc IS NOT NULL) AS tem_fbclid, l.gclid IS NOT NULL AS tem_gclid
      FROM l WHERE l.k = c.k
        AND (l.utm_source IS NOT NULL OR l.utm_campaign IS NOT NULL OR l.fbclid IS NOT NULL OR l.fbc IS NOT NULL OR l.gclid IS NOT NULL)
      UNION ALL
      SELECT p.created_at, p.utm_source, p.utm_medium, p.utm_campaign, p.utm_content, p.utm_term,
             p.fbclid IS NOT NULL, p.gclid IS NOT NULL
      FROM p WHERE p.k = c.k AND (p.utm_source IS NOT NULL OR p.utm_campaign IS NOT NULL OR p.fbclid IS NOT NULL OR p.gclid IS NOT NULL)
      UNION ALL
      SELECT w.primeiro_contato,
             CASE w.origem WHEN 'ctwa_ad' THEN 'meta' ELSE 'whatsapp' END,
             CASE w.origem WHEN 'ctwa_ad' THEN 'ctwa' WHEN 'link' THEN 'link' ELSE 'conversa' END,
             CASE w.origem WHEN 'ctwa_ad' THEN coalesce(w.origem_detalhe->>'headline', w.origem_detalhe->>'source_id')
                           WHEN 'link' THEN w.origem_detalhe->>'ref' END,
             NULL, NULL, false, false
      FROM w WHERE w.k = c.k
    ) cand
    ORDER BY cand.t
    LIMIT 1
  ) og ON true
  ORDER BY c.primeiro DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.funil_familias(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.funil_familias(timestamptz) TO authenticated;
