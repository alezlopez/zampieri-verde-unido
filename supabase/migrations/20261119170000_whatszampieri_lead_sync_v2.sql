-- Sincronização pré-matrícula/matrícula → WhatsZampieri (v2), como está rodando no banco desde out/2026.
-- Foi aplicada direto no banco a partir de whatszampieri/integrations/n8n-project/whatszampieri_lead_sync.sql;
-- esta migration traz a definição para o repositório do site, que passa a ser o dono deste SQL
-- (ver docs/integracao-site-whatszampieri.md). Tudo é CREATE OR REPLACE: reaplicar não muda nada.
--
-- Secrets no Vault: whatszampieri_lead_token (= LEAD_CALLBACK_TOKEN do WhatsZampieri) e
-- whatszampieri_anon_key (chave pública do WhatsZampieri, exigida pelo gateway das functions).

CREATE OR REPLACE FUNCTION public.whatszampieri_pre_stage(p_status text, p_acompanhamento text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_acompanhamento IN ('cancelado', 'desistente') THEN 'lost'
    WHEN p_status IN ('pendente', 'aprovado_aguardando_agendamento', 'aprovado_com_ressalvas',
                      'reenviado_aguardando_analise') THEN 'pre_enrollment'
    WHEN p_status = 'entrevista_agendada' THEN 'visit_scheduled'
    WHEN p_status = 'entrevista_concluida' THEN 'interview_done'
    WHEN p_status = 'reprovado' THEN 'lost'
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.whatszampieri_stage_from_matricula(p_status text, p_contrato_assinado boolean, p_acompanhamento text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_acompanhamento IN ('cancelado', 'desistente') THEN 'lost'
    WHEN p_status = 'concluida' OR p_contrato_assinado IS TRUE THEN 'enrolled'
    WHEN p_status IN ('documentos_aprovados', 'contrato_gerado') THEN 'enrollment_docs'
    ELSE 'interview_done'
  END;
$function$;

CREATE OR REPLACE FUNCTION public.whatszampieri_push_stage(p_phone text, p_stage text, p_note text DEFAULT NULL::text, p_lost_reason text DEFAULT NULL::text, p_pre_enrollment_id text DEFAULT NULL::text, p_force boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
  v_anon text;
BEGIN
  IF coalesce(p_phone, '') = '' OR p_stage IS NULL THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'whatszampieri_lead_token';
  SELECT decrypted_secret INTO v_anon FROM vault.decrypted_secrets WHERE name = 'whatszampieri_anon_key';
  IF v_token IS NULL OR v_anon IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://haizyqhkgkljpnwgbxjq.supabase.co/functions/v1/automation-callback',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon,
      'X-Webhook-Token', v_token
    ),
    body := jsonb_build_object(
      'action', 'lead_update',
      'phone', p_phone,
      'lead_stage', p_stage,
      'note', p_note,
      'lost_reason', p_lost_reason,
      'pre_enrollment_id', p_pre_enrollment_id,
      'force', p_force
    ),
    timeout_milliseconds := 30000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'whatszampieri_push_stage failed: %', SQLERRM;
END;
$function$;

CREATE OR REPLACE FUNCTION public.whatszampieri_sync_phone(p_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_best record;
BEGIN
  IF coalesce(p_phone, '') = '' THEN
    RETURN;
  END IF;

  WITH fam AS (
    SELECT p.protocolo, p.aluno_nome,
      CASE WHEN m.status IS NOT NULL
        THEN public.whatszampieri_stage_from_matricula(m.status, m.contrato_assinado, m.acompanhamento)
        ELSE public.whatszampieri_pre_stage(p.status, p.acompanhamento)
      END AS stage,
      CASE WHEN m.status IS NOT NULL
        THEN format('Matrícula de %s: %s', p.aluno_nome,
               CASE WHEN m.acompanhamento IN ('cancelado', 'desistente') THEN m.acompanhamento
                    ELSE replace(m.status, '_', ' ') END)
        ELSE format('Pré-matrícula %s de %s: %s', p.protocolo, p.aluno_nome,
               CASE WHEN p.acompanhamento IN ('cancelado', 'desistente') THEN p.acompanhamento
                    ELSE replace(p.status, '_', ' ') END)
      END AS note,
      CASE WHEN m.status IS NOT NULL THEN m.acompanhamento_motivo
           ELSE coalesce(p.acompanhamento_motivo, p.motivo_texto, p.motivo_reprovacao)
      END AS reason,
      p.created_at
    FROM public.prematriculas p
    LEFT JOIN LATERAL (
      SELECT status, contrato_assinado, acompanhamento, acompanhamento_motivo
      FROM public.matriculas WHERE prematricula_id = p.id ORDER BY created_at DESC LIMIT 1
    ) m ON true
    WHERE regexp_replace(p.resp_whatsapp, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  )
  SELECT * INTO v_best
  FROM fam
  WHERE stage IS NOT NULL
  ORDER BY (stage = 'lost'),
           array_position(ARRAY['pre_enrollment', 'visit_scheduled', 'interview_done',
                                'enrollment_docs', 'enrolled'], stage) DESC NULLS LAST,
           created_at DESC
  LIMIT 1;

  IF v_best IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.whatszampieri_push_stage(
    p_phone,
    v_best.stage,
    v_best.note,
    CASE WHEN v_best.stage = 'lost' THEN v_best.reason END,
    v_best.protocolo,
    true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.whatszampieri_prematricula_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.acompanhamento IS NOT DISTINCT FROM OLD.acompanhamento THEN
    RETURN NEW;
  END IF;
  PERFORM public.whatszampieri_sync_phone(NEW.resp_whatsapp);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'whatszampieri_prematricula_changed failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.whatszampieri_matricula_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.contrato_assinado IS NOT DISTINCT FROM OLD.contrato_assinado
     AND NEW.acompanhamento IS NOT DISTINCT FROM OLD.acompanhamento THEN
    RETURN NEW;
  END IF;
  SELECT resp_whatsapp INTO v_phone FROM public.prematriculas WHERE id = NEW.prematricula_id;
  PERFORM public.whatszampieri_sync_phone(v_phone);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'whatszampieri_matricula_changed failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.whatszampieri_resync_all()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (regexp_replace(resp_whatsapp, '\D', '', 'g')) resp_whatsapp
    FROM public.prematriculas
    WHERE coalesce(resp_whatsapp, '') <> ''
  LOOP
    PERFORM public.whatszampieri_sync_phone(r.resp_whatsapp);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;

DROP TRIGGER IF EXISTS whatszampieri_lead_sync ON public.prematriculas;
CREATE TRIGGER whatszampieri_lead_sync AFTER INSERT OR UPDATE OF status, acompanhamento ON public.prematriculas
  FOR EACH ROW EXECUTE FUNCTION public.whatszampieri_prematricula_changed();

DROP TRIGGER IF EXISTS whatszampieri_lead_sync ON public.matriculas;
CREATE TRIGGER whatszampieri_lead_sync AFTER INSERT OR UPDATE OF status, contrato_assinado, acompanhamento ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.whatszampieri_matricula_changed();
