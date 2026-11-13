-- Álbuns de fotos de eventos: página pública não listada (/fotos) e admin do setor "fotos".

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fotos';

CREATE TABLE IF NOT EXISTS public.fotos_albuns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 100),
  titulo text NOT NULL CHECK (length(trim(titulo)) BETWEEN 2 AND 160),
  descricao text CHECK (descricao IS NULL OR length(descricao) <= 1000),
  data_evento date,
  capa_item_id uuid,
  publicado boolean NOT NULL DEFAULT false,
  criado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fotos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.fotos_albuns(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('foto', 'instagram')),
  caminho text,
  miniatura text,
  largura integer,
  altura integer,
  instagram_url text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (tipo = 'foto' AND caminho IS NOT NULL AND miniatura IS NOT NULL)
    OR (tipo = 'instagram' AND instagram_url ~ '^https://(www\.)?instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]+')
  )
);
CREATE INDEX IF NOT EXISTS fotos_itens_album_idx ON public.fotos_itens (album_id, ordem, created_at);

ALTER TABLE public.fotos_albuns DROP CONSTRAINT IF EXISTS fotos_albuns_capa_fk;
ALTER TABLE public.fotos_albuns
  ADD CONSTRAINT fotos_albuns_capa_fk FOREIGN KEY (capa_item_id) REFERENCES public.fotos_itens(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS fotos_albuns_updated ON public.fotos_albuns;
CREATE TRIGGER fotos_albuns_updated BEFORE UPDATE ON public.fotos_albuns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fotos_albuns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_itens ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer pessoa vê álbuns publicados; o setor "fotos" vê também os rascunhos
DROP POLICY IF EXISTS fotos_albuns_ler ON public.fotos_albuns;
CREATE POLICY fotos_albuns_ler ON public.fotos_albuns FOR SELECT TO anon, authenticated
  USING (publicado OR public.has_setor(auth.uid(), 'fotos'));
DROP POLICY IF EXISTS fotos_albuns_editar ON public.fotos_albuns;
CREATE POLICY fotos_albuns_editar ON public.fotos_albuns FOR ALL TO authenticated
  USING (public.has_setor(auth.uid(), 'fotos')) WITH CHECK (public.has_setor(auth.uid(), 'fotos'));

DROP POLICY IF EXISTS fotos_itens_ler ON public.fotos_itens;
CREATE POLICY fotos_itens_ler ON public.fotos_itens FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.fotos_albuns a WHERE a.id = album_id AND a.publicado)
         OR public.has_setor(auth.uid(), 'fotos'));
DROP POLICY IF EXISTS fotos_itens_editar ON public.fotos_itens;
CREATE POLICY fotos_itens_editar ON public.fotos_itens FOR ALL TO authenticated
  USING (public.has_setor(auth.uid(), 'fotos')) WITH CHECK (public.has_setor(auth.uid(), 'fotos'));

GRANT SELECT ON public.fotos_albuns, public.fotos_itens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fotos_albuns, public.fotos_itens TO authenticated;

-- Arquivos: bucket público (endereços com nomes aleatórios); só o setor "fotos" envia e apaga
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fotos-eventos', 'fotos-eventos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS fotos_eventos_ler_setor ON storage.objects;
CREATE POLICY fotos_eventos_ler_setor ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-eventos' AND public.has_setor(auth.uid(), 'fotos'));
DROP POLICY IF EXISTS fotos_eventos_enviar ON storage.objects;
CREATE POLICY fotos_eventos_enviar ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-eventos' AND public.has_setor(auth.uid(), 'fotos'));
DROP POLICY IF EXISTS fotos_eventos_apagar ON storage.objects;
CREATE POLICY fotos_eventos_apagar ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-eventos' AND public.has_setor(auth.uid(), 'fotos'));
