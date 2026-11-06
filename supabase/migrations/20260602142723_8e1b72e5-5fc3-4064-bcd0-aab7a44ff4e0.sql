-- Correção manual: ingressos Tarcísio Ximenes e Ivanice Eleoterio (compra Tais Dos Santos Alves)
-- O pagamento Asaas pay_ul0c01pem4z29ftn (R$224, checkout 54eb036b-b71d-417a-a7e3-b09356fe1dd6)
-- cobriu 3 ingressos + 2 produtos, mas só 1 ingresso (Tais) tinha checkout_id correspondente.
-- Os outros 2 ficaram com checkout_id órfão e foram cancelados indevidamente.
-- Net 223.01 / 224 = 0.99558 → cada ingresso de R$40: líquido 39,82, taxa 0,18.

UPDATE public.ingressos
SET status = 'pago',
    cancelado_em = NULL,
    cancelado_por = NULL,
    motivo_cancelamento = NULL,
    asaas_payment_id = 'pay_ul0c01pem4z29ftn',
    checkout_id = '54eb036b-b71d-417a-a7e3-b09356fe1dd6',
    checkout_url = (SELECT checkout_url FROM public.ingressos WHERE id = '0113b5e0-8950-47b3-96c0-95ba1cde9e62'),
    forma_pagamento = 'pix',
    data_pagamento = '2026-06-01 00:00:00+00',
    data_credito = '2026-06-01',
    valor_total = 40,
    valor_bruto = 40,
    valor_liquido = 39.82,
    taxa_total = 0.18,
    utilizado = false
WHERE id IN (
  'fc4d63ac-84b8-411c-9372-5e6645d5523a', -- Tarcísio Ximenes
  'b5b03455-a503-4b90-9387-83c3e81e7667'  -- Ivanice Eleoterio dos Santos
);