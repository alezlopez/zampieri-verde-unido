ALTER TABLE public.produto_variacoes
  ADD COLUMN IF NOT EXISTS destaque_label text,
  ADD COLUMN IF NOT EXISTS descricao text;

ALTER TABLE public.evento_produtos
  ADD COLUMN IF NOT EXISTS preco_override jsonb,
  ADD COLUMN IF NOT EXISTS preco_evento jsonb;