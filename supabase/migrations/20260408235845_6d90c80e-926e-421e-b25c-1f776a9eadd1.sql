ALTER TABLE public.eventos ADD COLUMN requer_autorizacao boolean NOT NULL DEFAULT false;

CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'zampieri'
  AND (storage.foldername(name))[1] = 'eventos'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'zampieri'
  AND (storage.foldername(name))[1] = 'eventos'
  AND public.has_role(auth.uid(), 'admin')
);