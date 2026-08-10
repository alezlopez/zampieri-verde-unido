ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rematricula';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'matricula';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'eventos';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'portaria';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'produtos';

CREATE OR REPLACE FUNCTION public.has_setor(_user_id uuid, _setor text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role::text = 'admin'
        OR ur.role::text = _setor
        OR (_setor = 'portaria' AND ur.role::text = 'conferente')
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_setor(uuid, text) TO authenticated, anon, service_role;

-- ===== EVENTOS =====
DROP POLICY IF EXISTS "Admins can manage events" ON public.eventos;
CREATE POLICY "Admins can manage events" ON public.eventos FOR ALL
  USING (public.has_setor(auth.uid(), 'eventos'))
  WITH CHECK (public.has_setor(auth.uid(), 'eventos'));

DROP POLICY IF EXISTS "Admins manage evento_produtos" ON public.evento_produtos;
CREATE POLICY "Admins manage evento_produtos" ON public.evento_produtos FOR ALL
  USING (public.has_setor(auth.uid(), 'eventos'))
  WITH CHECK (public.has_setor(auth.uid(), 'eventos'));

DROP POLICY IF EXISTS "Anyone can view active evento_produtos" ON public.evento_produtos;
CREATE POLICY "Anyone can view active evento_produtos" ON public.evento_produtos FOR SELECT
  USING (ativo = true OR public.has_setor(auth.uid(), 'eventos'));

DROP POLICY IF EXISTS "Users can view own tickets" ON public.ingressos;
CREATE POLICY "Users can view own tickets" ON public.ingressos FOR SELECT
  USING (auth.uid() = user_id OR public.has_setor(auth.uid(), 'eventos') OR public.has_setor(auth.uid(), 'portaria'));

DROP POLICY IF EXISTS "Admins can update tickets" ON public.ingressos;
CREATE POLICY "Admins can update tickets" ON public.ingressos FOR UPDATE
  USING (public.has_setor(auth.uid(), 'eventos'));

DROP POLICY IF EXISTS "Admins can create any tickets" ON public.ingressos;
CREATE POLICY "Admins can create any tickets" ON public.ingressos FOR INSERT
  WITH CHECK (public.has_setor(auth.uid(), 'eventos'));

-- ===== PRODUTOS =====
DROP POLICY IF EXISTS "Admins manage produtos" ON public.produtos;
CREATE POLICY "Admins manage produtos" ON public.produtos FOR ALL
  USING (public.has_setor(auth.uid(), 'produtos'))
  WITH CHECK (public.has_setor(auth.uid(), 'produtos'));

DROP POLICY IF EXISTS "Anyone can view active produtos" ON public.produtos;
CREATE POLICY "Anyone can view active produtos" ON public.produtos FOR SELECT
  USING (ativo = true OR public.has_setor(auth.uid(), 'produtos') OR public.has_setor(auth.uid(), 'eventos'));

DROP POLICY IF EXISTS "Admins manage variacoes" ON public.produto_variacoes;
CREATE POLICY "Admins manage variacoes" ON public.produto_variacoes FOR ALL
  USING (public.has_setor(auth.uid(), 'produtos'))
  WITH CHECK (public.has_setor(auth.uid(), 'produtos'));

DROP POLICY IF EXISTS "Anyone can view active variacoes" ON public.produto_variacoes;
CREATE POLICY "Anyone can view active variacoes" ON public.produto_variacoes FOR SELECT
  USING (ativo = true OR public.has_setor(auth.uid(), 'produtos') OR public.has_setor(auth.uid(), 'eventos'));

DROP POLICY IF EXISTS "Users view own pedidos" ON public.pedidos_produtos;
CREATE POLICY "Users view own pedidos" ON public.pedidos_produtos FOR SELECT
  USING (auth.uid() = user_id OR public.has_setor(auth.uid(), 'produtos') OR public.has_setor(auth.uid(), 'portaria'));

DROP POLICY IF EXISTS "Admins manage pedidos" ON public.pedidos_produtos;
CREATE POLICY "Admins manage pedidos" ON public.pedidos_produtos FOR UPDATE
  USING (public.has_setor(auth.uid(), 'produtos'));

-- ===== MATRICULA / PRE-MATRICULA =====
DROP POLICY IF EXISTS "Admins gerenciam prematriculas" ON public.prematriculas;
CREATE POLICY "Admins gerenciam prematriculas" ON public.prematriculas FOR ALL
  USING (public.has_setor(auth.uid(), 'matricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

DROP POLICY IF EXISTS "Admins gerenciam matriculas" ON public.matriculas;
CREATE POLICY "Admins gerenciam matriculas" ON public.matriculas FOR ALL
  USING (public.has_setor(auth.uid(), 'matricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

DROP POLICY IF EXISTS "Admins gerenciam documentos de matricula" ON public.matricula_documentos;
CREATE POLICY "Admins gerenciam documentos de matricula" ON public.matricula_documentos FOR ALL
  USING (public.has_setor(auth.uid(), 'matricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

DROP POLICY IF EXISTS "Admins gerenciam agendamentos" ON public.prematricula_agendamentos;
CREATE POLICY "Admins gerenciam agendamentos" ON public.prematricula_agendamentos FOR ALL
  USING (public.has_setor(auth.uid(), 'matricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

DROP POLICY IF EXISTS "Admins gerenciam regras de agenda" ON public.prematricula_agenda_regras;
CREATE POLICY "Admins gerenciam regras de agenda" ON public.prematricula_agenda_regras FOR ALL
  USING (public.has_setor(auth.uid(), 'matricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

DROP POLICY IF EXISTS "Admins gerenciam bloqueios de agenda" ON public.prematricula_agenda_bloqueios;
CREATE POLICY "Admins gerenciam bloqueios de agenda" ON public.prematricula_agenda_bloqueios FOR ALL
  USING (public.has_setor(auth.uid(), 'matricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'matricula'));

-- ===== REMATRICULA =====
DROP POLICY IF EXISTS "Admins podem ver alteracoes" ON public.rematricula_2027_alteracoes;
CREATE POLICY "Admins podem ver alteracoes" ON public.rematricula_2027_alteracoes FOR SELECT
  USING (public.has_setor(auth.uid(), 'rematricula'));

DROP POLICY IF EXISTS "valores_2027_admin_gerencia" ON public.rematricula_valores_2027;
CREATE POLICY "valores_2027_admin_gerencia" ON public.rematricula_valores_2027 FOR ALL
  USING (public.has_setor(auth.uid(), 'rematricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'rematricula'));

DROP POLICY IF EXISTS "vagas_2027_admin_gerencia" ON public.vagas_2027;
CREATE POLICY "vagas_2027_admin_gerencia" ON public.vagas_2027 FOR ALL
  USING (public.has_setor(auth.uid(), 'rematricula'))
  WITH CHECK (public.has_setor(auth.uid(), 'rematricula'));