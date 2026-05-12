ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS aluno_cortesia boolean NOT NULL DEFAULT false;
ALTER TABLE public.ingressos ADD COLUMN IF NOT EXISTS cortesia boolean NOT NULL DEFAULT false;