UPDATE public.ingressos
SET status='pago',
    utilizado=false,
    cancelado_em=NULL,
    cancelado_por=NULL,
    motivo_cancelamento=NULL
WHERE id IN (
  'ad3519d9-76d3-4238-9de4-053af3fbb51c'::uuid, -- Lucas Sousa Conceicao
  'cfb3ae88-0f8a-4f4e-98da-74011cd41a8e'::uuid, -- Marcos William
  '19a3501a-a636-4895-8a6b-978ab86ab307'::uuid, -- Fabio Roberto Ramos
  'd27b67bf-19de-4e27-a00a-f70e4628e537'::uuid, -- Sueli Pascoal
  'f39d8705-2d54-4472-a2c9-fed97c717ba2'::uuid, -- Ana Paula
  '44ee271b-759a-4b38-905a-02e1df1e058f'::uuid, -- Maria Dalva
  'cb5d409a-6b96-45f6-88de-072ae62ff6d3'::uuid  -- Kátia da Silva Souza
);