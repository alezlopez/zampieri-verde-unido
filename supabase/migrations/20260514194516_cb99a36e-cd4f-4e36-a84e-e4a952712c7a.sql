ALTER TABLE public.ingressos ADD COLUMN IF NOT EXISTS checkout_criado_em timestamptz;
ALTER TABLE public.pedidos_produtos ADD COLUMN IF NOT EXISTS checkout_criado_em timestamptz;

UPDATE public.ingressos SET checkout_criado_em = created_at WHERE checkout_url IS NOT NULL AND checkout_criado_em IS NULL;
UPDATE public.pedidos_produtos SET checkout_criado_em = created_at WHERE checkout_url IS NOT NULL AND checkout_criado_em IS NULL;