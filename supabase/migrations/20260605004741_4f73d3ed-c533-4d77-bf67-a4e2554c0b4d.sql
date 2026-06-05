ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS sucesso_upsell_variacao_id uuid REFERENCES public.produto_variacoes(id);