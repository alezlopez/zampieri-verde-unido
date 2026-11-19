-- Funil de famílias para a direção (painel de Leads): uma linha por família (telefone),
-- etapa calculada na hora a partir de leads do site, visitas, pré-matrículas e matrículas.
-- Nada é copiado entre tabelas: as telas de pré-matrícula e matrícula continuam a fonte.

-- "Como conheceu o Colégio Zampieri?" (opcional na pré-matrícula; visível só no painel de Leads)
ALTER TABLE public.prematriculas
  ADD COLUMN como_conheceu text
  CHECK (como_conheceu IN ('indicacao', 'instagram', 'google', 'ex_aluno', 'passei_em_frente', 'outro'));

-- Restante da origem que o site já envia (o leads_site guarda o mesmo conjunto)
ALTER TABLE public.prematriculas
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_term text,
  ADD COLUMN fbclid text,
  ADD COLUMN gclid text;

-- Telefone sem país e sem o 9º dígito: DDD + 8 últimos dígitos (mesma família com ou sem o 9)
CREATE OR REPLACE FUNCTION public.chave_telefone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN length(d) >= 10 THEN substr(d, 1, 2) || right(d, 8) ELSE nullif(d, '') END
  FROM (SELECT regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^55(\d{10,11})$', '\1') AS d) x;
$$;

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
  ordem (etapa_nome, n) AS (
    VALUES ('perdido', 0), ('interessado', 1), ('visita_agendada', 2), ('visita_faltou', 2), ('visita_realizada', 3),
           ('pre_matricula', 4), ('aprovada', 5), ('documentos', 6), ('contrato', 7), ('matriculado', 8)
  ),
  chaves AS (
    SELECT k FROM l WHERE k IS NOT NULL UNION SELECT k FROM p WHERE k IS NOT NULL
  ),
  fam AS (
    SELECT
      c.k,
      (SELECT min(t) FROM (SELECT l.created_at AS t FROM l WHERE l.k = c.k UNION ALL SELECT p.created_at FROM p WHERE p.k = c.k) x) AS primeiro,
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
        ELSE 'interessado'
      END AS etapa_final
    FROM fam f
    WHERE p_desde IS NULL OR f.primeiro >= p_desde
  )
  SELECT
    c.k,
    coalesce((SELECT l.whatsapp FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1),
             (SELECT regexp_replace(p.resp_whatsapp, '\D', '', 'g') FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1)),
    coalesce((SELECT p.resp_nome FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1),
             (SELECT l.nome FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1)),
    (SELECT string_agg(DISTINCT p.aluno_nome, ', ') FROM p WHERE p.k = c.k),
    coalesce((SELECT string_agg(DISTINCT p.serie_pretendida, ', ') FROM p WHERE p.k = c.k),
             (SELECT l.serie FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1)),
    coalesce((SELECT p.turno_preferencia FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1),
             (SELECT l.turno FROM l WHERE l.k = c.k ORDER BY l.created_at DESC LIMIT 1)),
    c.primeiro,
    CASE WHEN c.primeiro_lead IS NOT NULL AND (c.primeiro_pre IS NULL OR c.primeiro_lead <= c.primeiro_pre)
         THEN (SELECT l.origem FROM l WHERE l.k = c.k ORDER BY l.created_at LIMIT 1)
         ELSE 'pre_direta' END,
    -- Origem: primeiro registro da família que trouxe alguma etiqueta (lead do site, senão pré-matrícula)
    CASE WHEN ol.k IS NOT NULL THEN ol.utm_source ELSE op.utm_source END,
    CASE WHEN ol.k IS NOT NULL THEN ol.utm_medium ELSE op.utm_medium END,
    CASE WHEN ol.k IS NOT NULL THEN ol.utm_campaign ELSE op.utm_campaign END,
    CASE WHEN ol.k IS NOT NULL THEN ol.utm_content ELSE op.utm_content END,
    CASE WHEN ol.k IS NOT NULL THEN ol.utm_term ELSE op.utm_term END,
    CASE WHEN ol.k IS NOT NULL THEN (ol.fbclid IS NOT NULL OR ol.fbc IS NOT NULL) ELSE coalesce(op.fbclid IS NOT NULL, false) END,
    CASE WHEN ol.k IS NOT NULL THEN ol.gclid IS NOT NULL ELSE coalesce(op.gclid IS NOT NULL, false) END,
    (SELECT p.como_conheceu FROM p WHERE p.k = c.k AND p.como_conheceu IS NOT NULL ORDER BY p.created_at DESC LIMIT 1),
    c.etapa_final,
    (SELECT o.n FROM ordem o WHERE o.etapa_nome = c.etapa_final),
    CASE WHEN c.etapa_final = 'perdido' THEN
      coalesce((SELECT p.motivo FROM p WHERE p.k = c.k ORDER BY p.created_at DESC LIMIT 1),
               (SELECT l.observacao FROM l WHERE l.k = c.k AND l.observacao IS NOT NULL ORDER BY l.updated_at DESC LIMIT 1))
    END,
    (NOT c.tem_pre AND c.leads_perdidos),
    coalesce((SELECT bool_or(p.espera) FROM p WHERE p.k = c.k), false),
    c.v_inicio,
    c.v_status,
    (SELECT string_agg(p.protocolo, ', ' ORDER BY p.created_at) FROM p WHERE p.k = c.k),
    coalesce((SELECT array_agg(l.id ORDER BY l.created_at) FROM l WHERE l.k = c.k), ARRAY[]::uuid[]),
    c.tem_pre
  FROM calc c
  LEFT JOIN LATERAL (
    SELECT l.k, l.created_at, l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content, l.utm_term, l.fbclid, l.fbc, l.gclid
    FROM l WHERE l.k = c.k
      AND (l.utm_source IS NOT NULL OR l.utm_campaign IS NOT NULL OR l.fbclid IS NOT NULL OR l.fbc IS NOT NULL OR l.gclid IS NOT NULL)
    ORDER BY l.created_at LIMIT 1
  ) ol ON true
  LEFT JOIN LATERAL (
    SELECT p.created_at, p.utm_source, p.utm_medium, p.utm_campaign, p.utm_content, p.utm_term, p.fbclid, p.gclid
    FROM p WHERE p.k = c.k AND (p.utm_source IS NOT NULL OR p.utm_campaign IS NOT NULL OR p.fbclid IS NOT NULL OR p.gclid IS NOT NULL)
    ORDER BY p.created_at LIMIT 1
  ) op ON true
  ORDER BY c.primeiro DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.funil_familias(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.funil_familias(timestamptz) TO authenticated;
