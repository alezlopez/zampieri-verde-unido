ALTER TABLE public.eventos ADD COLUMN preco_parcelado numeric NOT NULL DEFAULT 0;
ALTER TABLE public.eventos ADD COLUMN max_parcelas integer NOT NULL DEFAULT 1;