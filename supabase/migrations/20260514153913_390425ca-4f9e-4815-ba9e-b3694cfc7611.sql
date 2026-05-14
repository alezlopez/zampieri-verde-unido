with paid_events as (
  select
    payload->'payment' as payment,
    payload->'payment'->>'checkoutSession' as checkout_id,
    payload->'payment'->>'id' as payment_id,
    payload->'payment'->>'installment' as installment_id
  from public.asaas_webhook_events
  where event_type in ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_RECEIVED_IN_CASH')
    and payload->'payment'->>'checkoutSession' is not null
    and payload->'payment'->>'status' in ('CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH')
), aggregated as (
  select
    checkout_id,
    sum(coalesce((payment->>'value')::numeric, 0))::numeric(12,2) as bruto,
    sum(
      coalesce((payment->>'netValue')::numeric, coalesce((payment->>'value')::numeric, 0))
      - case
          when upper(coalesce(payment->>'billingType', '')) in ('CREDIT_CARD', 'CREDITCARD') then
            coalesce((payment->>'netValue')::numeric, coalesce((payment->>'value')::numeric, 0))
            * case
                when nullif(payment->>'installment', '') is not null then 0.026 * greatest(coalesce(nullif(payment->>'installmentNumber', '')::numeric, 1), 1)
                else 0.0215
              end
          else 0
        end
    )::numeric(12,2) as liquido,
    max(coalesce(payment->>'paymentDate', payment->>'confirmedDate', payment->>'clientPaymentDate')) as data_pagamento_txt,
    max(payment->>'creditDate') as data_credito_txt,
    coalesce(max(nullif(installment_id, '')), max(payment_id)) as stable_id
  from paid_events
  group by checkout_id
), pedidos as (
  select id, checkout_id, valor_total,
         sum(valor_total) over (partition by checkout_id) as total_checkout,
         row_number() over (partition by checkout_id order by created_at, id) as rn,
         count(*) over (partition by checkout_id) as cnt
  from public.pedidos_produtos
  where status = 'pago'
    and valor_liquido is null
    and checkout_id is not null
), calculados as (
  select
    p.id,
    p.checkout_id,
    a.stable_id,
    case
      when p.rn = p.cnt then a.bruto - coalesce(sum(round((a.bruto * case when p.total_checkout > 0 then p.valor_total / p.total_checkout else 1.0 / p.cnt end)::numeric, 2)) over (partition by p.checkout_id order by p.rn rows between unbounded preceding and 1 preceding), 0)
      else round((a.bruto * case when p.total_checkout > 0 then p.valor_total / p.total_checkout else 1.0 / p.cnt end)::numeric, 2)
    end as valor_bruto,
    case
      when p.rn = p.cnt then a.liquido - coalesce(sum(round((a.liquido * case when p.total_checkout > 0 then p.valor_total / p.total_checkout else 1.0 / p.cnt end)::numeric, 2)) over (partition by p.checkout_id order by p.rn rows between unbounded preceding and 1 preceding), 0)
      else round((a.liquido * case when p.total_checkout > 0 then p.valor_total / p.total_checkout else 1.0 / p.cnt end)::numeric, 2)
    end as valor_liquido,
    case when a.data_pagamento_txt is not null then a.data_pagamento_txt::timestamptz else null end as data_pagamento,
    case when a.data_credito_txt is not null then a.data_credito_txt::date else null end as data_credito
  from pedidos p
  join aggregated a on a.checkout_id = p.checkout_id
)
update public.pedidos_produtos pp
set
  valor_bruto = c.valor_bruto,
  valor_liquido = c.valor_liquido,
  taxa_total = round((c.valor_bruto - c.valor_liquido)::numeric, 2),
  data_pagamento = c.data_pagamento,
  data_credito = c.data_credito,
  asaas_payment_id = coalesce(pp.asaas_payment_id, c.stable_id)
from calculados c
where pp.id = c.id;