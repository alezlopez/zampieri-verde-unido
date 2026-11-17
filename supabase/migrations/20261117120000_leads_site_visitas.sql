-- Leads da página /informativomatricula (formulário curto, WhatsApp e visita),
-- com a origem de campanha para medir os anúncios, e a agenda de visitas à escola.

CREATE TABLE public.leads_site (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  origem text NOT NULL CHECK (origem IN ('visita', 'whatsapp', 'formulario')),
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 150),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^[0-9]{10,11}$'),
  serie text NOT NULL CHECK (char_length(serie) <= 100),
  turno text CHECK (turno IN ('Manhã', 'Tarde')),
  ref text NOT NULL UNIQUE,
  -- Origem de campanha (última campanha que trouxe a pessoa, guardada por 30 dias no navegador)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  pagina text,
  referrer text,
  meta_event_id text,
  fbp text,
  fbc text,
  -- Acompanhamento pela secretaria
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'convertido', 'perdido')),
  observacao text
);
CREATE INDEX leads_site_created_idx ON public.leads_site (created_at DESC);
CREATE INDEX leads_site_whatsapp_idx ON public.leads_site (whatsapp);

CREATE TABLE public.visita_agenda_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  duracao_min integer NOT NULL DEFAULT 45 CHECK (duracao_min BETWEEN 10 AND 240),
  capacidade integer NOT NULL DEFAULT 1 CHECK (capacidade BETWEEN 1 AND 20),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (hora_fim > hora_inicio)
);

CREATE TABLE public.visita_agenda_bloqueios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL UNIQUE,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads_site (id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'faltou', 'cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visitas_inicio_idx ON public.visitas (inicio) WHERE status = 'agendada';
-- Um lead tem no máximo uma visita agendada por vez
CREATE UNIQUE INDEX visitas_um_agendamento_por_lead ON public.visitas (lead_id) WHERE status = 'agendada';

CREATE OR REPLACE FUNCTION public.tocar_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER leads_site_updated BEFORE UPDATE ON public.leads_site FOR EACH ROW EXECUTE FUNCTION public.tocar_updated_at();
CREATE TRIGGER visita_agenda_regras_updated BEFORE UPDATE ON public.visita_agenda_regras FOR EACH ROW EXECUTE FUNCTION public.tocar_updated_at();
CREATE TRIGGER visitas_updated BEFORE UPDATE ON public.visitas FOR EACH ROW EXECUTE FUNCTION public.tocar_updated_at();

/**
 * Reserva um horário de visita sem estourar a capacidade, mesmo com duas famílias
 * escolhendo o mesmo horário ao mesmo tempo (trava por horário).
 */
CREATE OR REPLACE FUNCTION public.visita_reservar(p_lead uuid, p_inicio timestamptz, p_fim timestamptz, p_capacidade integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ocupados integer;
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('visita:' || p_inicio::text));
  SELECT count(*) INTO v_ocupados FROM public.visitas WHERE inicio = p_inicio AND status = 'agendada';
  IF v_ocupados >= p_capacidade THEN
    RAISE EXCEPTION 'horario_indisponivel' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.visitas (lead_id, inicio, fim) VALUES (p_lead, p_inicio, p_fim) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.visita_reservar(uuid, timestamptz, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visita_reservar(uuid, timestamptz, timestamptz, integer) TO service_role;

-- O site grava pela edge function (service role); só a equipe de matrículas lê e altera.
ALTER TABLE public.leads_site ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visita_agenda_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visita_agenda_bloqueios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_site_equipe ON public.leads_site FOR ALL TO authenticated
  USING (public.has_setor(auth.uid(), 'matricula')) WITH CHECK (public.has_setor(auth.uid(), 'matricula'));
CREATE POLICY visita_regras_equipe ON public.visita_agenda_regras FOR ALL TO authenticated
  USING (public.has_setor(auth.uid(), 'matricula')) WITH CHECK (public.has_setor(auth.uid(), 'matricula'));
CREATE POLICY visita_bloqueios_equipe ON public.visita_agenda_bloqueios FOR ALL TO authenticated
  USING (public.has_setor(auth.uid(), 'matricula')) WITH CHECK (public.has_setor(auth.uid(), 'matricula'));
CREATE POLICY visitas_equipe ON public.visitas FOR ALL TO authenticated
  USING (public.has_setor(auth.uid(), 'matricula')) WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

REVOKE ALL ON public.leads_site, public.visita_agenda_regras, public.visita_agenda_bloqueios, public.visitas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_site, public.visita_agenda_regras, public.visita_agenda_bloqueios, public.visitas TO authenticated;
