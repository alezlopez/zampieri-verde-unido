
CREATE TABLE public.admin_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor text NOT NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  link text,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_notificacoes TO authenticated;
GRANT ALL ON public.admin_notificacoes TO service_role;

ALTER TABLE public.admin_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem notificacoes do seu setor"
  ON public.admin_notificacoes FOR SELECT TO authenticated
  USING (public.has_setor(auth.uid(), setor));

CREATE INDEX idx_admin_notificacoes_created ON public.admin_notificacoes (created_at DESC);
CREATE INDEX idx_admin_notificacoes_setor ON public.admin_notificacoes (setor, created_at DESC);

CREATE TABLE public.admin_notificacoes_lidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id uuid NOT NULL REFERENCES public.admin_notificacoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lida_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notificacao_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.admin_notificacoes_lidas TO authenticated;
GRANT ALL ON public.admin_notificacoes_lidas TO service_role;

ALTER TABLE public.admin_notificacoes_lidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve suas leituras"
  ON public.admin_notificacoes_lidas FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuario marca suas leituras"
  ON public.admin_notificacoes_lidas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuario remove suas leituras"
  ON public.admin_notificacoes_lidas FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notificar_admin(
  _setor text, _tipo text, _titulo text, _descricao text DEFAULT NULL,
  _link text DEFAULT NULL, _ref_id text DEFAULT NULL
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.admin_notificacoes (setor, tipo, titulo, descricao, link, ref_id)
  VALUES (_setor, _tipo, _titulo, _descricao, _link, _ref_id);
$$;

-- Pré-matrícula
CREATE OR REPLACE FUNCTION public.trg_notif_prematricula()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notificar_admin('matricula','prematricula_nova',
      'Nova pré-matrícula',
      NEW.aluno_nome || ' — ' || NEW.serie_pretendida,
      '/prematricula/admin', NEW.id::text);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notificar_admin('matricula','prematricula_status',
      'Pré-matrícula: ' || NEW.status,
      NEW.aluno_nome, '/prematricula/admin', NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_prematricula
AFTER INSERT OR UPDATE OF status ON public.prematriculas
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_prematricula();

-- Agendamento de entrevista
CREATE OR REPLACE FUNCTION public.trg_notif_agendamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _nome text;
BEGIN
  SELECT aluno_nome INTO _nome FROM public.prematriculas WHERE id = NEW.prematricula_id;
  PERFORM public.notificar_admin('matricula','entrevista_agendada',
    'Entrevista agendada',
    COALESCE(_nome,'Aluno') || ' — ' || to_char(NEW.inicio AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI'),
    '/prematricula/admin', NEW.prematricula_id::text);
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_agendamento
AFTER INSERT ON public.prematricula_agendamentos
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_agendamento();

-- Documentos da matrícula
CREATE OR REPLACE FUNCTION public.trg_notif_documento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _nome text;
BEGIN
  SELECT nome_aluno INTO _nome FROM public.matriculas WHERE id = NEW.matricula_id;
  PERFORM public.notificar_admin('matricula','documento_enviado',
    'Documento enviado',
    COALESCE(_nome,'Aluno') || ' — ' || NEW.tipo,
    '/matricula/admin', NEW.matricula_id::text);
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_documento
AFTER INSERT ON public.matricula_documentos
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_documento();

-- Matrícula: dados, contrato, conclusão
CREATE OR REPLACE FUNCTION public.trg_notif_matricula()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.dados_preenchidos_em IS NOT NULL AND OLD.dados_preenchidos_em IS NULL THEN
    PERFORM public.notificar_admin('matricula','matricula_dados',
      'Dados do contrato preenchidos', NEW.nome_aluno, '/matricula/admin', NEW.id::text);
  END IF;
  IF NEW.contrato_assinado AND NOT COALESCE(OLD.contrato_assinado,false) THEN
    PERFORM public.notificar_admin('matricula','matricula_contrato',
      'Contrato de matrícula assinado', NEW.nome_aluno, '/matricula/admin', NEW.id::text);
  END IF;
  IF NEW.concluida_em IS NOT NULL AND OLD.concluida_em IS NULL THEN
    PERFORM public.notificar_admin('matricula','matricula_concluida',
      'Matrícula concluída', NEW.nome_aluno, '/matricula/admin', NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_matricula
AFTER UPDATE ON public.matriculas
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_matricula();

-- Rematrícula 2027
CREATE OR REPLACE FUNCTION public.trg_notif_rematricula()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.contrato_assinado,false) AND NOT COALESCE(OLD.contrato_assinado,false) THEN
    PERFORM public.notificar_admin('rematricula','rematricula_contrato',
      'Contrato de rematrícula assinado', NEW.nome_aluno, '/rematricula2027/admin', NEW.id_aluno::text);
  END IF;
  IF COALESCE(NEW.rematricula_concluida,false) AND NOT COALESCE(OLD.rematricula_concluida,false) THEN
    PERFORM public.notificar_admin('rematricula','rematricula_concluida',
      'Rematrícula concluída', NEW.nome_aluno || ' — ' || NEW.curso_2027, '/rematricula2027/admin', NEW.id_aluno::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_rematricula
AFTER UPDATE ON public.alunos_rematricula_2027
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_rematricula();

-- Débitos quitados
CREATE OR REPLACE FUNCTION public.trg_notif_devedor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.pago AND NOT COALESCE(OLD.pago,false) THEN
    PERFORM public.notificar_admin('rematricula','debito_pago',
      'Débito quitado',
      COALESCE(NEW.nome_aluno,'Aluno') || ' — ' || COALESCE(NEW.evento,''),
      '/renegociacao/admin', NEW.id_aluno::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_devedor
AFTER UPDATE ON public.devedores_2027
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_devedor();

-- Ingressos pagos
CREATE OR REPLACE FUNCTION public.trg_notif_ingresso()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pago' AND OLD.status IS DISTINCT FROM 'pago' THEN
    PERFORM public.notificar_admin('eventos','ingresso_pago',
      'Ingresso pago',
      NEW.nome_comprador || ' — ' || NEW.quantidade || ' ingresso(s)',
      '/eventos/admin/relatorio', NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_ingresso
AFTER UPDATE OF status ON public.ingressos
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_ingresso();

-- Pedidos de produtos pagos
CREATE OR REPLACE FUNCTION public.trg_notif_pedido_produto()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pago' AND OLD.status IS DISTINCT FROM 'pago' THEN
    PERFORM public.notificar_admin('produtos','pedido_pago',
      'Pedido de produto pago',
      NEW.nome_comprador || ' — ' || NEW.quantidade || ' item(ns)',
      '/eventos/admin/produtos/relatorio', NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notif_pedido_produto
AFTER UPDATE OF status ON public.pedidos_produtos
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_pedido_produto();

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notificacoes;
