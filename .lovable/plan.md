# Validade do PIX da rematrícula aparece como "8795h"

## O que está acontecendo

Na tela de pagamento aparece "Válido por mais 8795h 2min" — cerca de um ano. O texto logo abaixo diz que o código vale 24 horas, então a tela se contradiz.

A causa: quem define esse prazo hoje é a data que o banco (Asaas) devolve junto com o QR Code do PIX, e essa data vem com validade longuíssima. A nossa regra de 24 horas não é aplicada ao que é exibido nem ao que controla a liberação de um novo código.

## O que muda

1. A validade mostrada passa a ser sempre 24 horas contadas a partir do momento em que o código foi gerado — nunca a data longa devolvida pelo banco.
2. Quando um pagamento já existente é reaberto, a contagem regressiva parte do horário real de criação daquele código, mostrando o tempo que ainda resta.
3. Passadas as 24 horas, o código é tratado como expirado e o botão de gerar um novo é liberado, como já está previsto na tela.
4. O texto de validade continua igual: vale por 24 horas, e depois disso basta gerar outro.

Nada muda em valores, desconto, contrato, cartão, conclusão da rematrícula ou nos pagamentos já recebidos.

## Detalhes técnicos

- `supabase/functions/rematricula-2027-checkout/index.ts`: ao criar e ao reaproveitar a cobrança PIX, calcular `pix.expira_em` como `checkout_criado_em + CHECKOUT_TTL_MS` (24h) e usar o menor valor entre esse e o `expirationDate` do Asaas. O reuso de PIX pendente passa a respeitar essa janela (hoje ele reaproveita enquanto o Asaas disser que o QR é válido).
- `src/components/rematricula/StepPagamento.tsx`: proteger a contagem regressiva com um teto de 24h, para nunca renderizar prazos absurdos mesmo que a API devolva outra data.
