
DROP POLICY IF EXISTS "Administradores podem inserir vagas" ON public.vagas_turmas;
DROP POLICY IF EXISTS "Administradores podem atualizar vagas" ON public.vagas_turmas;
DROP POLICY IF EXISTS "Administradores podem deletar vagas" ON public.vagas_turmas;

CREATE POLICY "Administradores podem inserir vagas"
ON public.vagas_turmas
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Administradores podem atualizar vagas"
ON public.vagas_turmas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Administradores podem deletar vagas"
ON public.vagas_turmas
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
