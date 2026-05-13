
-- ============ PRODUTOS ============
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  imagem_url text,
  ativo boolean NOT NULL DEFAULT true,
  estoque_controlado boolean NOT NULL DEFAULT false,
  estoque_total integer,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active produtos" ON public.produtos
  FOR SELECT USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage produtos" ON public.produtos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VARIAÇÕES ============
CREATE TABLE public.produto_variacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco numeric NOT NULL DEFAULT 0,
  preco_parcelado numeric NOT NULL DEFAULT 0,
  max_parcelas integer NOT NULL DEFAULT 1,
  estoque_total integer,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.produto_variacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_variacoes_produto ON public.produto_variacoes(produto_id);

CREATE POLICY "Anyone can view active variacoes" ON public.produto_variacoes
  FOR SELECT USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage variacoes" ON public.produto_variacoes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_variacoes_updated_at BEFORE UPDATE ON public.produto_variacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VÍNCULO EVENTO <-> PRODUTO ============
CREATE TABLE public.evento_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, produto_id)
);
ALTER TABLE public.evento_produtos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ep_evento ON public.evento_produtos(evento_id);

CREATE POLICY "Anyone can view active evento_produtos" ON public.evento_produtos
  FOR SELECT USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage evento_produtos" ON public.evento_produtos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ PEDIDOS DE PRODUTO ============
CREATE TABLE public.pedidos_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  evento_id uuid REFERENCES public.eventos(id) ON DELETE SET NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  variacao_id uuid NOT NULL REFERENCES public.produto_variacoes(id),
  nome_comprador text NOT NULL,
  cpf_comprador text,
  email_comprador text,
  celular_comprador text,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  forma_pagamento text,
  parcelas integer NOT NULL DEFAULT 1,
  asaas_payment_id text,
  asaas_customer_id text,
  checkout_id text,
  checkout_url text,
  valor_bruto numeric,
  valor_liquido numeric,
  taxa_total numeric,
  data_pagamento timestamptz,
  data_credito date,
  retirado_em timestamptz,
  retirado_por uuid,
  qr_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos_produtos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pedidos_produtos_user ON public.pedidos_produtos(user_id);
CREATE INDEX idx_pedidos_produtos_evento ON public.pedidos_produtos(evento_id);
CREATE INDEX idx_pedidos_produtos_variacao ON public.pedidos_produtos(variacao_id);
CREATE INDEX idx_pedidos_produtos_checkout ON public.pedidos_produtos(checkout_id);

CREATE POLICY "Users view own pedidos" ON public.pedidos_produtos
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own pedidos" ON public.pedidos_produtos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage pedidos" ON public.pedidos_produtos
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pedidos_produtos_updated_at BEFORE UPDATE ON public.pedidos_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ESTOQUE ============
CREATE OR REPLACE FUNCTION public.contar_estoque_produto(p_variacao_id uuid)
RETURNS TABLE(estoque_total integer, vendidos integer, disponivel integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_var_estoque integer;
  v_prod_estoque integer;
  v_prod_id uuid;
  v_total integer;
  v_vendidos integer;
BEGIN
  SELECT v.estoque_total, v.produto_id INTO v_var_estoque, v_prod_id
  FROM produto_variacoes v WHERE v.id = p_variacao_id;
  IF v_var_estoque IS NOT NULL THEN
    v_total := v_var_estoque;
  ELSE
    SELECT p.estoque_total INTO v_prod_estoque FROM produtos p
    WHERE p.id = v_prod_id AND p.estoque_controlado = true;
    v_total := v_prod_estoque;
  END IF;
  IF v_total IS NULL THEN
    RETURN QUERY SELECT NULL::int, 0, NULL::int;
    RETURN;
  END IF;
  SELECT COALESCE(SUM(quantidade),0)::int INTO v_vendidos
  FROM pedidos_produtos
  WHERE variacao_id = p_variacao_id
    AND status IN ('pendente','pago','retirado');
  RETURN QUERY SELECT v_total, v_vendidos, GREATEST(v_total - v_vendidos, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_estoque_pedido_produto()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_disp integer;
BEGIN
  IF NEW.status NOT IN ('pendente','pago','retirado') THEN
    RETURN NEW;
  END IF;
  SELECT disponivel INTO v_disp FROM contar_estoque_produto(NEW.variacao_id);
  IF v_disp IS NOT NULL AND v_disp < NEW.quantidade THEN
    RAISE EXCEPTION 'estoque_insuficiente' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_estoque BEFORE INSERT ON public.pedidos_produtos
  FOR EACH ROW EXECUTE FUNCTION public.validar_estoque_pedido_produto();

-- ============ RETIRADA NA PORTARIA ============
CREATE OR REPLACE FUNCTION public.marcar_produto_retirado(p_qr_token uuid)
RETURNS TABLE(ok boolean, message text, pedido_id uuid, produto text, variacao text, quantidade integer, retirado_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pedido pedidos_produtos%ROWTYPE;
  v_prod_nome text;
  v_var_nome text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT false, 'sem_permissao'::text, NULL::uuid, NULL::text, NULL::text, NULL::int, NULL::timestamptz;
    RETURN;
  END IF;
  SELECT * INTO v_pedido FROM pedidos_produtos WHERE qr_token = p_qr_token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'nao_encontrado'::text, NULL::uuid, NULL::text, NULL::text, NULL::int, NULL::timestamptz;
    RETURN;
  END IF;
  IF v_pedido.status <> 'pago' AND v_pedido.status <> 'retirado' THEN
    RETURN QUERY SELECT false, ('status_invalido:' || v_pedido.status)::text, v_pedido.id, NULL::text, NULL::text, v_pedido.quantidade, v_pedido.retirado_em;
    RETURN;
  END IF;
  SELECT p.nome, v.nome INTO v_prod_nome, v_var_nome
  FROM produtos p JOIN produto_variacoes v ON v.id = v_pedido.variacao_id
  WHERE p.id = v_pedido.produto_id;
  IF v_pedido.status = 'retirado' THEN
    RETURN QUERY SELECT false, 'ja_retirado'::text, v_pedido.id, v_prod_nome, v_var_nome, v_pedido.quantidade, v_pedido.retirado_em;
    RETURN;
  END IF;
  UPDATE pedidos_produtos
    SET status = 'retirado', retirado_em = now(), retirado_por = auth.uid()
    WHERE id = v_pedido.id;
  RETURN QUERY SELECT true, 'ok'::text, v_pedido.id, v_prod_nome, v_var_nome, v_pedido.quantidade, now();
END;
$$;

-- RPC pública para visualizar comprovante via qr_token (sem expor user_id)
CREATE OR REPLACE FUNCTION public.get_comprovante_produto(p_qr_token uuid)
RETURNS TABLE(pedido_id uuid, produto text, variacao text, quantidade integer, nome_comprador text, status text, evento_titulo text, evento_data date, evento_local text, retirado_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT pp.id, p.nome, v.nome, pp.quantidade, pp.nome_comprador, pp.status,
         e.titulo, e.data_evento, e.local, pp.retirado_em
  FROM pedidos_produtos pp
  JOIN produtos p ON p.id = pp.produto_id
  JOIN produto_variacoes v ON v.id = pp.variacao_id
  LEFT JOIN eventos e ON e.id = pp.evento_id
  WHERE pp.qr_token = p_qr_token;
END;
$$;
