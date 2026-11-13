-- O papel anon não executa has_setor (revogado de propósito). A política única
-- "publicado OR has_setor(...)" quebrava a leitura pública; separa por papel.
DROP POLICY fotos_albuns_ler ON public.fotos_albuns;
DROP POLICY fotos_itens_ler ON public.fotos_itens;
CREATE POLICY fotos_albuns_ler_publico ON public.fotos_albuns FOR SELECT TO anon USING (publicado);
CREATE POLICY fotos_albuns_ler_logado ON public.fotos_albuns FOR SELECT TO authenticated USING (publicado OR public.has_setor(auth.uid(), 'fotos'));
CREATE POLICY fotos_itens_ler_publico ON public.fotos_itens FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.fotos_albuns a WHERE a.id = fotos_itens.album_id AND a.publicado));
CREATE POLICY fotos_itens_ler_logado ON public.fotos_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fotos_albuns a WHERE a.id = fotos_itens.album_id AND a.publicado) OR public.has_setor(auth.uid(), 'fotos'));
