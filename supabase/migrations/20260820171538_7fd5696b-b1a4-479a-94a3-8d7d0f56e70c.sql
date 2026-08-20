DROP POLICY IF EXISTS "Usuarios autenticados podem ler perfis" ON public.user_profiles;
CREATE POLICY "Perfil proprio ou equipe operacional"
ON public.user_profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'conferente')
  OR public.has_setor(auth.uid(), 'eventos')
  OR public.has_setor(auth.uid(), 'portaria')
  OR public.has_setor(auth.uid(), 'produtos')
);

DROP POLICY IF EXISTS "Administradores podem ver vagas" ON public.vagas_turmas;
CREATE POLICY "Administradores podem ver vagas"
ON public.vagas_turmas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_setor(auth.uid(), 'matricula')
  OR public.has_setor(auth.uid(), 'rematricula')
);