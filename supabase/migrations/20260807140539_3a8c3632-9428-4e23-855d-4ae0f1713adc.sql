CREATE TABLE public.matriculas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prematricula_id uuid NOT NULL UNIQUE REFERENCES public.prematriculas(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'documentos_pendentes',

  resp_fin_quem text,
  resp_fin_nome text,
  resp_fin_cpf text,
  resp_fin_rg text,
  resp_fin_estado_civil text,
  resp_fin_naturalidade text,
  resp_fin_nacionalidade text,
  resp_fin_profissao text,
  resp_fin_data_nascimento date,
  resp_fin_celular text,
  resp_fin_email text,

  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,

  nome_pai text,
  cpf_pai text,
  celular_pai text,
  email_pai text,
  nome_mae text,
  cpf_mae text,
  celular_mae text,
  email_mae text,

  nome_aluno text,
  data_nascimento_aluno date,
  curso text,
  turno text,

  anuidade_total text,
  anuidade_total_ext text,
  percentual_desconto numeric,
  percentual_desconto_ext text,
  valor_com_desconto numeric,
  valor_com_desconto_ext text,
  valor_pri_parcela text,
  valor_pri_parcela_ext text,
  dia_vencimento smallint,
  valor_matricula numeric,
  permite_avista boolean NOT NULL DEFAULT true,
  permite_parcelado boolean NOT NULL DEFAULT true,
  max_parcelas integer NOT NULL DEFAULT 12,

  contrato_gerado boolean NOT NULL DEFAULT false,
  contrato_assinado boolean NOT NULL DEFAULT false,
  link_contrato text,
  zapsign_token text,
  contrato_gerado_em timestamptz,
  contrato_assinado_em timestamptz,

  asaas_customer_id text,
  asaas_payment_id text,
  asaas_checkout_id text,
  checkout_url text,
  checkout_criado_em timestamptz,
  forma_pagamento text,
  parcelas integer,
  valor_pago numeric,
  data_pagamento timestamptz,
  email_conclusao_enviado_em timestamptz,

  documentos_aprovados_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.matriculas TO service_role;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam matriculas" ON public.matriculas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.matricula_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  storage_path text NOT NULL,
  nome_arquivo text,
  status text NOT NULL DEFAULT 'enviado',
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matricula_id, tipo)
);

GRANT ALL ON public.matricula_documentos TO service_role;
ALTER TABLE public.matricula_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam documentos de matricula" ON public.matricula_documentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.matricula_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_matriculas_updated_at
BEFORE UPDATE ON public.matriculas
FOR EACH ROW EXECUTE FUNCTION public.matricula_touch_updated_at();

CREATE TRIGGER trg_matricula_documentos_updated_at
BEFORE UPDATE ON public.matricula_documentos
FOR EACH ROW EXECUTE FUNCTION public.matricula_touch_updated_at();