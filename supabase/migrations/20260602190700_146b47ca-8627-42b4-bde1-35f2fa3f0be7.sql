UPDATE public.ingressos
SET status='pago',
    utilizado=false,
    checkout_id = CASE id
      WHEN '7dd30efb-b5ed-4898-a310-bd20c282aa2f'::uuid THEN 'fb8ca0d5-f174-4605-9daf-c5092cf0b299'
      WHEN 'e6740547-dc04-4e1a-ab52-d8e932a93415'::uuid THEN '4bb600ee-e98d-4134-a0e0-520c6f69f215'
    END,
    cancelado_em=NULL,
    cancelado_por=NULL,
    motivo_cancelamento=NULL
WHERE id IN ('7dd30efb-b5ed-4898-a310-bd20c282aa2f'::uuid,
             'e6740547-dc04-4e1a-ab52-d8e932a93415'::uuid);