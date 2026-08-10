DROP POLICY IF EXISTS "Permitir leitura de usernames para autenticação" ON public.user_profiles;
REVOKE SELECT ON public.user_profiles FROM anon;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
CREATE POLICY "Usuarios autenticados podem ler perfis"
ON public.user_profiles FOR SELECT TO authenticated USING (true);