-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20261018134646).

-- see whatszampieri repo: integrations/n8n-project/whatszampieri_lead_sync.sql
CREATE OR REPLACE FUNCTION public.whatszampieri_lead_update(
  p_phone text,
  p_stage text,
  p_note text DEFAULT NULL,
  p_lost_reason text DEFAULT NULL,
  p_pre_enrollment_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      'pre_enrollment_id', p_pre_enrollment_id
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'whatszampieri_lead_update failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.whatszampieri_lead_update(text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.whatszampieri_stage_from_prematricula(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'pendente' THEN 'pre_enrollment'
    WHEN 'aprovado_aguardando_agendamento' THEN 'pre_enrollment'
    WHEN 'aprovado_com_ressalvas' THEN 'pre_enrollment'
    WHEN 'reenviado_aguardando_analise' THEN 'pre_enrollment'
    WHEN 'entrevista_agendada' THEN 'visit_scheduled'
    WHEN 'entrevista_concluida' THEN 'interview_done'
    WHEN 'reprovado' THEN 'lost'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.whatszampieri_prematricula_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_labels jsonb := jsonb_build_object(
    'pendente', 'aguardando análise',
    'aprovado_aguardando_agendamento', 'aprovada, aguardando agendamento da entrevista',
    'aprovado_com_ressalvas', 'aprovada com pendência de documento',
    'reenviado_aguardando_analise', 'documento reenviado, aguardando análise',
    'entrevista_agendada', 'entrevista agendada',
    'entrevista_concluida', 'entrevista concluída',
    'reprovado', 'reprovada'
  );
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  PERFORM public.whatszampieri_lead_update(
    NEW.resp_whatsapp,
    public.whatszampieri_stage_from_prematricula(NEW.status),
    format('Pré-matrícula %s de %s: %s', NEW.protocolo, NEW.aluno_nome,
           coalesce(v_labels ->> NEW.status, NEW.status)),
    CASE WHEN NEW.status = 'reprovado' THEN coalesce(NEW.motivo_texto, NEW.motivo_reprovacao) END,
    NEW.protocolo
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'whatszampieri_prematricula_changed failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER whatszampieri_lead_sync
AFTER INSERT OR UPDATE OF status ON public.prematriculas
FOR EACH ROW
EXECUTE FUNCTION public.whatszampieri_prematricula_changed();

CREATE OR REPLACE FUNCTION public.whatszampieri_matricula_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pm record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  SELECT resp_whatsapp, protocolo, aluno_nome INTO v_pm
  FROM public.prematriculas WHERE id = NEW.prematricula_id;
  IF v_pm IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.whatszampieri_lead_update(
    v_pm.resp_whatsapp,
    CASE WHEN NEW.status = 'concluida' THEN 'enrolled' ELSE 'enrollment_docs' END,
    format('Matrícula de %s: %s', v_pm.aluno_nome, replace(coalesce(NEW.status, ''), '_', ' ')),
    NULL,
    v_pm.protocolo
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'whatszampieri_matricula_changed failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER whatszampieri_lead_sync
AFTER INSERT OR UPDATE OF status ON public.matriculas
FOR EACH ROW
EXECUTE FUNCTION public.whatszampieri_matricula_changed();

CREATE OR REPLACE FUNCTION public.whatszampieri_resync_all()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT p.resp_whatsapp, p.protocolo, p.aluno_nome, p.status, p.motivo_texto, p.motivo_reprovacao,
           m.status AS matricula_status
    FROM public.prematriculas p
    LEFT JOIN LATERAL (
      SELECT status FROM public.matriculas WHERE prematricula_id = p.id ORDER BY created_at DESC LIMIT 1
    ) m ON true
  LOOP
    IF r.matricula_status IS NOT NULL THEN
      PERFORM public.whatszampieri_lead_update(
        r.resp_whatsapp,
        CASE WHEN r.matricula_status = 'concluida' THEN 'enrolled' ELSE 'enrollment_docs' END,
        format('Matrícula de %s: %s', r.aluno_nome, replace(r.matricula_status, '_', ' ')),
        NULL, r.protocolo);
    ELSE
      PERFORM public.whatszampieri_lead_update(
        r.resp_whatsapp,
        public.whatszampieri_stage_from_prematricula(r.status),
        format('Pré-matrícula %s de %s: %s', r.protocolo, r.aluno_nome, replace(r.status, '_', ' ')),
        CASE WHEN r.status = 'reprovado' THEN coalesce(r.motivo_texto, r.motivo_reprovacao) END,
        r.protocolo);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.whatszampieri_resync_all() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.whatszampieri_prematricula_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.whatszampieri_matricula_changed() FROM PUBLIC, anon, authenticated;
