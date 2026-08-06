CREATE TABLE public.prematriculas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  token_hash text NOT NULL,
  resp_nome text NOT NULL,
  resp_email text NOT NULL,
  resp_cpf text NOT NULL,
  resp_whatsapp text NOT NULL,
  aluno_nome text NOT NULL,
  aluno_nascimento date NOT NULL,
  serie_pretendida text NOT NULL,
  turno_preferencia text NOT NULL,
  escola_atual text,
  tipo_escola text,
  repetiu_ano text,
  boletim_path text,
  dificuldade_aprendizagem text,
  atendimento_complementar text,
  dificuldade_atencao text,
  diagnostico text,
  diagnostico_detalhe text,
  laudo_path text,
  dificuldade_socializacao text,
  usa_medicacao text,
  medicacao_detalhe text,
  alergias text,
  observacoes_saude text,
  consentimento_veracidade boolean NOT NULL DEFAULT false,
  consentimento_privacidade boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendente',
  motivo_reprovacao text,
  desconto_percentual integer,
  observacoes_entrevista text,
  aprovado_em timestamptz,
  reprovado_em timestamptz,
  agendado_em timestamptz,
  entrevista_concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prematriculas_status_check CHECK (status IN ('pendente','aprovado_aguardando_agendamento','reprovado','entrevista_agendada','entrevista_concluida')),
  CONSTRAINT prematriculas_desconto_check CHECK (desconto_percentual IS NULL OR desconto_percentual IN (5,10,15,20,25,30))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prematriculas TO authenticated;
GRANT ALL ON public.prematriculas TO service_role;
ALTER TABLE public.prematriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam prematriculas" ON public.prematriculas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_prematriculas_status ON public.prematriculas(status);
CREATE INDEX idx_prematriculas_token ON public.prematriculas(token_hash);

CREATE TABLE public.prematricula_agenda_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  duracao_min integer NOT NULL DEFAULT 45 CHECK (duracao_min > 0),
  capacidade integer NOT NULL DEFAULT 1 CHECK (capacidade > 0),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prematricula_agenda_regras TO authenticated;
GRANT ALL ON public.prematricula_agenda_regras TO service_role;
ALTER TABLE public.prematricula_agenda_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam regras de agenda" ON public.prematricula_agenda_regras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.prematricula_agenda_bloqueios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prematricula_agenda_bloqueios TO authenticated;
GRANT ALL ON public.prematricula_agenda_bloqueios TO service_role;
ALTER TABLE public.prematricula_agenda_bloqueios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam bloqueios de agenda" ON public.prematricula_agenda_bloqueios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.prematricula_agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prematricula_id uuid NOT NULL REFERENCES public.prematriculas(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','cancelado','concluido')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prematricula_agendamentos TO authenticated;
GRANT ALL ON public.prematricula_agendamentos TO service_role;
ALTER TABLE public.prematricula_agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam agendamentos" ON public.prematricula_agendamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_prematricula_agendamentos_inicio ON public.prematricula_agendamentos(inicio);

CREATE OR REPLACE FUNCTION public.prematricula_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_prematriculas_updated BEFORE UPDATE ON public.prematriculas
  FOR EACH ROW EXECUTE FUNCTION public.prematricula_touch_updated_at();
CREATE TRIGGER trg_prematricula_regras_updated BEFORE UPDATE ON public.prematricula_agenda_regras
  FOR EACH ROW EXECUTE FUNCTION public.prematricula_touch_updated_at();
CREATE TRIGGER trg_prematricula_agendamentos_updated BEFORE UPDATE ON public.prematricula_agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.prematricula_touch_updated_at();

INSERT INTO public.prematricula_agenda_regras (dia_semana, hora_inicio, hora_fim, duracao_min, capacidade)
SELECT d, TIME '08:00', TIME '17:00', 45, 1 FROM generate_series(1,5) AS d;