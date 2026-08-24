WITH pagos AS (
  SELECT
    (split_part(e.payload->'checkout'->>'externalReference', ':', 2))::bigint AS id_aluno,
    e.payload->'checkout'->>'id' AS checkout_id,
    (
      SELECT COALESCE(SUM(COALESCE((it->>'value')::numeric,0) * COALESCE((it->>'quantity')::numeric,1)), 0)
      FROM jsonb_array_elements(COALESCE(e.payload->'checkout'->'items', '[]'::jsonb)) it
    ) AS total,
    e.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY (split_part(e.payload->'checkout'->>'externalReference', ':', 2))
      ORDER BY e.created_at DESC
    ) AS rn
  FROM public.asaas_webhook_events e
  WHERE e.payload->'checkout'->>'externalReference' LIKE 'remat:%'
    AND e.payload->'checkout'->>'status' = 'PAID'
)
UPDATE public.alunos_rematricula_2027 a
SET valor_pago = p.total,
    asaas_checkout_id = COALESCE(a.asaas_checkout_id, p.checkout_id)
FROM pagos p
WHERE p.rn = 1
  AND p.id_aluno = a.id_aluno
  AND a.rematricula_concluida IS TRUE
  AND a.valor_pago IS NULL
  AND p.total > 0;