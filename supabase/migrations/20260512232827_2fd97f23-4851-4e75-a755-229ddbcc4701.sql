-- Remove broad public SELECT policies on storage.objects for zampieri bucket.
-- Public CDN URLs continue to work because the bucket is marked public.
-- This only blocks the ability to LIST files via the API.
DROP POLICY IF EXISTS "full lc6hjx_0" ON storage.objects;
DROP POLICY IF EXISTS "Public read zampieri" ON storage.objects;