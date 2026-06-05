ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS sucesso_upsell_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sucesso_upsell_titulo text,
  ADD COLUMN IF NOT EXISTS sucesso_upsell_subtitulo text,
  ADD COLUMN IF NOT EXISTS sucesso_upsell_badge text;