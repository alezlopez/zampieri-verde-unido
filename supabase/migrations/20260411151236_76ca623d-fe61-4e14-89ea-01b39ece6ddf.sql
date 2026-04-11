
-- 1. Fix alunos_26: remove public SELECT, restrict to admins
DROP POLICY IF EXISTS "Permitir leitura pública de alunnos_26" ON public.alunos_26;

CREATE POLICY "Admins can read alunos_26"
ON public.alunos_26
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix zampieri storage: remove open write policies, restrict to admins
DROP POLICY IF EXISTS "full lc6hjx_1" ON storage.objects;
DROP POLICY IF EXISTS "full lc6hjx_2" ON storage.objects;
DROP POLICY IF EXISTS "full lc6hjx_3" ON storage.objects;

-- Allow public read (bucket is public for event images)
CREATE POLICY "Public read zampieri"
ON storage.objects
FOR SELECT
USING (bucket_id = 'zampieri');

-- Only admins can upload
CREATE POLICY "Admins can upload to zampieri"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'zampieri' AND public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update zampieri"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'zampieri' AND public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete from zampieri"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'zampieri' AND public.has_role(auth.uid(), 'admin'));
