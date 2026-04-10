ALTER TABLE public.eventos ADD COLUMN is_excursao boolean NOT NULL DEFAULT false;
ALTER TABLE public.ingressos ADD COLUMN utilizado boolean NOT NULL DEFAULT false;