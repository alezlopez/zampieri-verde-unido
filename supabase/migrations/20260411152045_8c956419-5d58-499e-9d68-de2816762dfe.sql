
-- 1. Create secure CPF lookup RPC (replaces direct alunos_26 query for auth)
CREATE OR REPLACE FUNCTION public.find_email_by_cpf(p_cpf text)
RETURNS TABLE(email text, nome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_clean text;
BEGIN
  cpf_clean := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean THEN a.email_pai
      ELSE a.email_mae
    END as email,
    CASE 
      WHEN regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean THEN a.nome_pai
      ELSE a.nome_mae
    END as nome
  FROM alunos_26 a
  WHERE regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = cpf_clean
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = cpf_clean
  LIMIT 1;
END;
$$;

-- 2. Fix codigos_verificacao: restrict to code owner
DROP POLICY IF EXISTS "Leitura pública codigos_verificacao" ON public.codigos_verificacao;
DROP POLICY IF EXISTS "Inserção pública codigos_verificacao" ON public.codigos_verificacao;
DROP POLICY IF EXISTS "Update pública codigos_verificacao" ON public.codigos_verificacao;

CREATE POLICY "Authenticated read own codes" ON public.codigos_verificacao
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated insert codes" ON public.codigos_verificacao
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update own codes" ON public.codigos_verificacao
FOR UPDATE TO authenticated
USING (true);

-- 3. Fix pre_matricula: public insert for enrollment, admin-only management
DROP POLICY IF EXISTS "prematricula" ON public.pre_matricula;

CREATE POLICY "Anyone can submit pre_matricula" ON public.pre_matricula
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read pre_matricula" ON public.pre_matricula
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pre_matricula" ON public.pre_matricula
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pre_matricula" ON public.pre_matricula
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Fix comunicados_2026: public read, admin-only write
DROP POLICY IF EXISTS "leitura publica" ON public.comunicados_2026;

CREATE POLICY "Public can read comunicados" ON public.comunicados_2026
FOR SELECT USING (true);

CREATE POLICY "Admins can insert comunicados" ON public.comunicados_2026
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update comunicados" ON public.comunicados_2026
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete comunicados" ON public.comunicados_2026
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Fix rematricula: admin-only access
DROP POLICY IF EXISTS "Permitir leitura pública de dados de rematricula" ON public.rematricula;
DROP POLICY IF EXISTS "Administradores podem atualizar rematriculas" ON public.rematricula;
DROP POLICY IF EXISTS "Administradores podem deletar rematriculas" ON public.rematricula;
DROP POLICY IF EXISTS "Administradores podem inserir rematriculas" ON public.rematricula;

CREATE POLICY "Admins can read rematricula" ON public.rematricula
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert rematricula" ON public.rematricula
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rematricula" ON public.rematricula
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rematricula" ON public.rematricula
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Fix alunosIntegraSae: admin-only access
DROP POLICY IF EXISTS "Permitir leitura pública de dados de alunos" ON public."alunosIntegraSae";
DROP POLICY IF EXISTS "Administradores podem atualizar dados financeiros" ON public."alunosIntegraSae";
DROP POLICY IF EXISTS "Administradores podem deletar dados financeiros" ON public."alunosIntegraSae";
DROP POLICY IF EXISTS "Administradores podem inserir dados financeiros" ON public."alunosIntegraSae";

CREATE POLICY "Admins can read alunosIntegraSae" ON public."alunosIntegraSae"
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert alunosIntegraSae" ON public."alunosIntegraSae"
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alunosIntegraSae" ON public."alunosIntegraSae"
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete alunosIntegraSae" ON public."alunosIntegraSae"
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Fix codigosCurso: add admin-only policy
CREATE POLICY "Admins can manage codigosCurso" ON public."codigosCurso"
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
