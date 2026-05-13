-- Corrige valor unitário dos ingressos da compradora Flavia (checkout 274c5bca-9721-4b8d-83c1-2fdee8c27234)
-- O valor_total do checkout (520) foi gravado erroneamente em cada ingresso, quando o correto é o unitário (260).
UPDATE public.ingressos
SET valor_total = 260
WHERE checkout_id = '274c5bca-9721-4b8d-83c1-2fdee8c27234'
  AND valor_total = 520;