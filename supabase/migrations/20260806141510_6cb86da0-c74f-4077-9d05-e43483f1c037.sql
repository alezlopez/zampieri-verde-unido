CREATE POLICY "Admins leem documentos de prematricula"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'prematricula-docs' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem documentos de prematricula"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'prematricula-docs' AND public.has_role(auth.uid(), 'admin'::app_role));