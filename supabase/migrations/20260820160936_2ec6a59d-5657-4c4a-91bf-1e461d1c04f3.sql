-- 1) Colunas de pagamento nos débitos
ALTER TABLE public.devedores_2027
  ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pago_em timestamptz,
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS asaas_checkout_id text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_pago numeric,
  ADD COLUMN IF NOT EXISTS baixa_manual_por uuid,
  ADD COLUMN IF NOT EXISTS baixa_manual_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_devedores_2027_id_aluno ON public.devedores_2027 (id_aluno);

-- 2) Checkouts de renegociação
CREATE TABLE IF NOT EXISTS public.renegociacao_2027_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_aluno bigint NOT NULL,
  row_ids bigint[] NOT NULL,
  valor_total numeric NOT NULL,
  forma_pagamento text NOT NULL,
  parcelas integer NOT NULL DEFAULT 1,
  asaas_customer_id text,
  asaas_checkout_id text,
  asaas_payment_id text,
  checkout_url text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.renegociacao_2027_checkouts TO service_role;
ALTER TABLE public.renegociacao_2027_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin rematricula ve checkouts de renegociacao"
  ON public.renegociacao_2027_checkouts FOR SELECT TO authenticated
  USING (public.has_setor(auth.uid(), 'rematricula'));

CREATE INDEX IF NOT EXISTS idx_reneg_checkouts_aluno ON public.renegociacao_2027_checkouts (id_aluno);
CREATE INDEX IF NOT EXISTS idx_reneg_checkouts_asaas ON public.renegociacao_2027_checkouts (asaas_checkout_id);

CREATE TRIGGER trg_reneg_checkouts_updated
  BEFORE UPDATE ON public.renegociacao_2027_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Recalcula liberação: só true quando não há débito em aberto
CREATE OR REPLACE FUNCTION public.renegociacao_2027_recalcular_liberacao(p_id_aluno bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_abertos integer;
BEGIN
  SELECT count(*) INTO v_abertos
  FROM public.devedores_2027 d
  WHERE d.id_aluno = p_id_aluno AND COALESCE(d.pago, false) = false;

  UPDATE public.alunos_rematricula_2027
     SET rematricula_liberada = (v_abertos = 0),
         updated_at = now()
   WHERE id_aluno = p_id_aluno;

  RETURN v_abertos = 0;
END;
$$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_recalcular_liberacao(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_recalcular_liberacao(bigint) TO service_role;

-- 4) Débitos do aluno (público, autenticado por data de nascimento)
CREATE OR REPLACE FUNCTION public.renegociacao_2027_debitos(p_id_aluno bigint, p_data_nascimento date)
RETURNS TABLE(
  row_id bigint,
  evento text,
  vencimento text,
  valor_principal numeric,
  juros numeric,
  multa numeric,
  valor_a_vista numeric,
  valor_parcelado numeric,
  pago boolean,
  pago_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.rematricula_2027_rate_hit('reneg_debitos', 30, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.alunos_rematricula_2027 a
    WHERE a.id_aluno = p_id_aluno AND a.data_nascimento_aluno = p_data_nascimento
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT d.row_id::bigint, d.evento, d.vencimento, d.valor_principal, d.juros, d.multa,
         d.valor_a_vista, d.valor_parcelado, COALESCE(d.pago, false), d.pago_em
  FROM public.devedores_2027 d
  WHERE d.id_aluno = p_id_aluno
  ORDER BY d.vencimento;
END;
$$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_debitos(bigint, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_debitos(bigint, date) TO anon, authenticated, service_role;

-- 5) Status resumido (polling)
CREATE OR REPLACE FUNCTION public.renegociacao_2027_status(p_id_aluno bigint, p_data_nascimento date)
RETURNS TABLE(
  total_debitos integer,
  em_aberto integer,
  valor_aberto numeric,
  valor_pago numeric,
  quitado boolean,
  rematricula_liberada boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.alunos_rematricula_2027 a
    WHERE a.id_aluno = p_id_aluno AND a.data_nascimento_aluno = p_data_nascimento
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT count(*)::int,
         count(*) FILTER (WHERE NOT COALESCE(d.pago, false))::int,
         COALESCE(sum(d.valor_a_vista) FILTER (WHERE NOT COALESCE(d.pago, false)), 0),
         COALESCE(sum(d.valor_pago) FILTER (WHERE COALESCE(d.pago, false)), 0),
         count(*) FILTER (WHERE NOT COALESCE(d.pago, false)) = 0,
         COALESCE((SELECT a.rematricula_liberada FROM public.alunos_rematricula_2027 a WHERE a.id_aluno = p_id_aluno), false)
  FROM public.devedores_2027 d
  WHERE d.id_aluno = p_id_aluno;
END;
$$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_status(bigint, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_status(bigint, date) TO anon, authenticated, service_role;

-- 6) Canais de OTP para alunos devedores (ignora rematricula_liberada)
CREATE OR REPLACE FUNCTION public.renegociacao_2027_canais(p_id_aluno bigint)
RETURNS TABLE(chave text, canal text, rotulo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a public.alunos_rematricula_2027%ROWTYPE;
  v_tel text;
  v_mail text;
BEGIN
  IF NOT public.rematricula_2027_rate_hit('reneg_canais', 20, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  SELECT * INTO a FROM public.alunos_rematricula_2027 WHERE id_aluno = p_id_aluno LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  v_tel := regexp_replace(COALESCE(a.celular_mae, ''), '[^0-9]', '', 'g');
  IF length(v_tel) >= 10 THEN
    chave := 'celular_mae'; canal := 'whatsapp';
    rotulo := '(' || substr(v_tel, 1, 2) || ') •••••-' || right(v_tel, 4);
    RETURN NEXT;
  END IF;

  v_tel := regexp_replace(COALESCE(a.celular_pai, ''), '[^0-9]', '', 'g');
  IF length(v_tel) >= 10 THEN
    chave := 'celular_pai'; canal := 'whatsapp';
    rotulo := '(' || substr(v_tel, 1, 2) || ') •••••-' || right(v_tel, 4);
    RETURN NEXT;
  END IF;

  v_mail := lower(trim(COALESCE(a.email_mae, '')));
  IF position('@' in v_mail) > 1 THEN
    chave := 'email_mae'; canal := 'email';
    rotulo := left(split_part(v_mail, '@', 1), 2) || '•••@' || split_part(v_mail, '@', 2);
    RETURN NEXT;
  END IF;

  v_mail := lower(trim(COALESCE(a.email_pai, '')));
  IF position('@' in v_mail) > 1 THEN
    chave := 'email_pai'; canal := 'email';
    rotulo := left(split_part(v_mail, '@', 1), 2) || '•••@' || split_part(v_mail, '@', 2);
    RETURN NEXT;
  END IF;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_canais(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_canais(bigint) TO anon, authenticated, service_role;

-- 7) Painel admin: listagem por aluno
CREATE OR REPLACE FUNCTION public.renegociacao_2027_admin_listagem()
RETURNS TABLE(
  id_aluno bigint,
  nome_aluno text,
  curso_atual text,
  total_debitos integer,
  em_aberto integer,
  valor_aberto numeric,
  valor_pago numeric,
  situacao text,
  ultima_forma text,
  ultimo_pagamento timestamptz,
  rematricula_liberada boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RAISE EXCEPTION 'nao_autorizado';
  END IF;

  RETURN QUERY
  SELECT d.id_aluno,
         COALESCE(a.nome_aluno, max(d.nome_aluno)),
         a.curso_atual,
         count(*)::int,
         count(*) FILTER (WHERE NOT COALESCE(d.pago, false))::int,
         COALESCE(sum(d.valor_a_vista) FILTER (WHERE NOT COALESCE(d.pago, false)), 0),
         COALESCE(sum(d.valor_pago) FILTER (WHERE COALESCE(d.pago, false)), 0),
         CASE
           WHEN count(*) FILTER (WHERE NOT COALESCE(d.pago, false)) = 0 THEN 'quitado'
           WHEN count(*) FILTER (WHERE COALESCE(d.pago, false)) > 0 THEN 'parcial'
           ELSE 'aberto'
         END,
         max(d.forma_pagamento),
         max(d.pago_em),
         COALESCE(a.rematricula_liberada, false)
  FROM public.devedores_2027 d
  LEFT JOIN public.alunos_rematricula_2027 a ON a.id_aluno = d.id_aluno
  GROUP BY d.id_aluno, a.nome_aluno, a.curso_atual, a.rematricula_liberada
  ORDER BY 2;
END;
$$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_admin_listagem() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_admin_listagem() TO authenticated, service_role;

-- 8) Painel admin: débitos detalhados de um aluno
CREATE OR REPLACE FUNCTION public.renegociacao_2027_admin_debitos(p_id_aluno bigint)
RETURNS TABLE(
  row_id bigint,
  evento text,
  vencimento text,
  valor_a_vista numeric,
  valor_parcelado numeric,
  pago boolean,
  pago_em timestamptz,
  forma_pagamento text,
  valor_pago numeric,
  asaas_payment_id text,
  baixa_manual_em timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RAISE EXCEPTION 'nao_autorizado';
  END IF;

  RETURN QUERY
  SELECT d.row_id::bigint, d.evento, d.vencimento, d.valor_a_vista, d.valor_parcelado,
         COALESCE(d.pago, false), d.pago_em, d.forma_pagamento, d.valor_pago,
         d.asaas_payment_id, d.baixa_manual_em
  FROM public.devedores_2027 d
  WHERE d.id_aluno = p_id_aluno
  ORDER BY d.vencimento;
END;
$$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_admin_debitos(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_admin_debitos(bigint) TO authenticated, service_role;

-- 9) Painel admin: baixa manual
CREATE OR REPLACE FUNCTION public.renegociacao_2027_admin_baixa(p_row_id bigint, p_pago boolean)
RETURNS TABLE(id_aluno bigint, liberada boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aluno bigint;
  v_liberada boolean;
BEGIN
  IF NOT public.has_setor(auth.uid(), 'rematricula') THEN
    RAISE EXCEPTION 'nao_autorizado';
  END IF;

  UPDATE public.devedores_2027 d
     SET pago = p_pago,
         pago_em = CASE WHEN p_pago THEN COALESCE(d.pago_em, now()) ELSE NULL END,
         valor_pago = CASE WHEN p_pago THEN COALESCE(d.valor_pago, d.valor_a_vista) ELSE NULL END,
         forma_pagamento = CASE WHEN p_pago THEN COALESCE(d.forma_pagamento, 'manual') ELSE NULL END,
         baixa_manual_por = auth.uid(),
         baixa_manual_em = now()
   WHERE d.row_id = p_row_id
   RETURNING d.id_aluno INTO v_aluno;

  IF v_aluno IS NULL THEN
    RAISE EXCEPTION 'debito_nao_encontrado';
  END IF;

  v_liberada := public.renegociacao_2027_recalcular_liberacao(v_aluno);

  id_aluno := v_aluno;
  liberada := v_liberada;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_admin_baixa(bigint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renegociacao_2027_admin_baixa(bigint, boolean) TO authenticated, service_role;