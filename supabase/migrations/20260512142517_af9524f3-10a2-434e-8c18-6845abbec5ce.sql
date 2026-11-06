
-- 1. Compradores externos
CREATE TABLE public.compradores_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  cpf text NOT NULL UNIQUE,
  nome text NOT NULL,
  email text NOT NULL,
  celular text,
  data_nascimento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compradores_externos_cpf ON public.compradores_externos(cpf);

ALTER TABLE public.compradores_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own external buyer"
  ON public.compradores_externos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own external buyer"
  ON public.compradores_externos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own external buyer"
  ON public.compradores_externos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage external buyers"
  ON public.compradores_externos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_compradores_externos_updated_at
  BEFORE UPDATE ON public.compradores_externos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Eventos: público-alvo
ALTER TABLE public.eventos
  ADD COLUMN publico_alvo text NOT NULL DEFAULT 'alunos_e_convidados'
    CHECK (publico_alvo IN ('apenas_alunos', 'alunos_e_convidados', 'aberto_ao_publico'));

-- 3. Ingressos: campos Asaas
ALTER TABLE public.ingressos
  ADD COLUMN asaas_customer_id text,
  ADD COLUMN asaas_payment_id text,
  ADD COLUMN forma_pagamento text,
  ADD COLUMN parcelas integer NOT NULL DEFAULT 1,
  ADD COLUMN valor_total numeric,
  ADD COLUMN tipo_comprador text NOT NULL DEFAULT 'aluno'
    CHECK (tipo_comprador IN ('aluno', 'externo'));

CREATE INDEX idx_ingressos_asaas_payment_id ON public.ingressos(asaas_payment_id);

-- 4. Auditoria de webhooks Asaas
CREATE TABLE public.asaas_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payment_id text,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asaas_webhook_events_payment_id ON public.asaas_webhook_events(payment_id);

ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook events"
  ON public.asaas_webhook_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. RPC: descobrir contexto por CPF (aluno / externo / nenhum)
CREATE OR REPLACE FUNCTION public.find_user_context_by_cpf(p_cpf text)
RETURNS TABLE(origem text, email text, nome text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_clean text;
  v_email text;
  v_nome text;
BEGIN
  cpf_clean := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  IF cpf_clean = '' THEN
    RETURN QUERY SELECT 'nenhum'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Aluno?
  SELECT
    CASE
      WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean THEN a.email_pai
      ELSE a.email_mae
    END,
    CASE
      WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean THEN a.nome_pai
      ELSE a.nome_mae
    END
  INTO v_email, v_nome
  FROM alunos_26 a
  WHERE regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = cpf_clean
  LIMIT 1;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    RETURN QUERY SELECT 'aluno'::text, v_email, v_nome;
    RETURN;
  END IF;

  -- Externo?
  SELECT c.email, c.nome INTO v_email, v_nome
  FROM compradores_externos c
  WHERE c.cpf = cpf_clean
  LIMIT 1;

  IF v_email IS NOT NULL THEN
    RETURN QUERY SELECT 'externo'::text, v_email, v_nome;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'nenhum'::text, NULL::text, NULL::text;
END;
$$;

-- 6. RPC: dados do comprador para edge function (consulta segura)
CREATE OR REPLACE FUNCTION public.get_comprador_dados(p_user_id uuid)
RETURNS TABLE(origem text, nome text, cpf text, email text, celular text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_cpf text;
BEGIN
  -- Tenta externo primeiro (cadastro próprio)
  RETURN QUERY
  SELECT 'externo'::text, c.nome, c.cpf, c.email, c.celular
  FROM compradores_externos c
  WHERE c.user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Senão, tenta resolver via auth.users -> alunos_26
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  IF v_email IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    'aluno'::text,
    COALESCE(
      CASE WHEN lower(trim(a.email_pai)) = lower(trim(v_email)) THEN a.nome_pai ELSE NULL END,
      CASE WHEN lower(trim(a.email_mae)) = lower(trim(v_email)) THEN a.nome_mae ELSE NULL END
    ) as nome,
    COALESCE(
      CASE WHEN lower(trim(a.email_pai)) = lower(trim(v_email)) THEN regexp_replace(COALESCE(a.cpf_pai,''),'[^0-9]','','g') ELSE NULL END,
      CASE WHEN lower(trim(a.email_mae)) = lower(trim(v_email)) THEN regexp_replace(COALESCE(a.cpf_mae,''),'[^0-9]','','g') ELSE NULL END
    ) as cpf,
    v_email as email,
    COALESCE(
      CASE WHEN lower(trim(a.email_pai)) = lower(trim(v_email)) THEN a.celular_pai ELSE NULL END,
      CASE WHEN lower(trim(a.email_mae)) = lower(trim(v_email)) THEN a.telefone_mae ELSE NULL END
    ) as celular
  FROM alunos_26 a
  WHERE lower(trim(a.email_pai)) = lower(trim(v_email))
     OR lower(trim(a.email_mae)) = lower(trim(v_email))
  LIMIT 1;
END;
$$;
