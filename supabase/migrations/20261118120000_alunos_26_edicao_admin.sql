-- Edição de responsáveis (alunos_26) pelo painel admin, com histórico, e consulta das
-- contas de acesso pelo e-mail (usada pela edge function admin-responsaveis).

CREATE TABLE public.alunos_26_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  alterado_por uuid,
  codigo_aluno text,
  acao text NOT NULL CHECK (acao IN ('editar', 'acesso_temporario')),
  responsavel text CHECK (responsavel IN ('mae', 'pai')),
  antes jsonb,
  depois jsonb,
  alunos_afetados text[]
);
CREATE INDEX alunos_26_alteracoes_codigo_idx ON public.alunos_26_alteracoes (codigo_aluno, created_at DESC);

ALTER TABLE public.alunos_26_alteracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY alunos_26_alteracoes_admin_le ON public.alunos_26_alteracoes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.alunos_26_alteracoes FROM anon;
GRANT SELECT ON public.alunos_26_alteracoes TO authenticated;

-- Contas de acesso (auth) pelos e-mails dos responsáveis. Só a edge function (service role) usa.
CREATE OR REPLACE FUNCTION public.admin_contas_por_email(p_emails text[])
RETURNS TABLE (id uuid, email text, criado_em timestamptz, ultimo_acesso timestamptz, confirmado boolean, trocar_senha boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at IS NOT NULL,
         COALESCE((u.raw_user_meta_data->>'trocar_senha')::boolean, false)
  FROM auth.users u
  WHERE lower(u.email) IN (SELECT lower(trim(e)) FROM unnest(p_emails) e WHERE coalesce(trim(e), '') <> '');
$$;
REVOKE ALL ON FUNCTION public.admin_contas_por_email(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_contas_por_email(text[]) TO service_role;
