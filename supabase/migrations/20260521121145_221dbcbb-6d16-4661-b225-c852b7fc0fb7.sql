ALTER TABLE public.evento_produtos
  ADD COLUMN IF NOT EXISTS pre_selecionado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variacao_padrao_id uuid,
  ADD COLUMN IF NOT EXISTS qtd_padrao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS destaque_label text;