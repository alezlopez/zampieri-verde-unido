# PIX da rematrícula 2027 dando "código inválido"

## O que foi verificado

- A aluna Sophia Barbosa Dos Santos Ventura (id 568) está sem contrato assinado e **sem nenhum checkout criado** no banco — o caso dela não gerou cobrança nenhuma; é preciso tratá-la separadamente (secretaria).
- No fluxo geral: 74 rematrículas via PIX já foram concluídas, então a integração funciona. Mas o checkout do Asaas é criado com **expiração de 60 minutos** (`minutesToExpire: 60`) e o link salvo é reaproveitado enquanto tiver menos de 60 minutos de criado.

Esse é o comportamento compatível com a reclamação: a família abre o checkout, copia o código PIX, e paga depois (ou volta ao link mandado no WhatsApp). Passados os 60 minutos, o QR/código já não é mais aceito pelo banco — aparece como "código inválido". Hoje não existe nenhuma forma na tela de gerar um PIX novo: o botão sempre chama a mesma função e, se o link antigo ainda estiver na janela de reaproveitamento, devolve o mesmo checkout vencido.

## O que muda

1. **PIX passa a valer 24 horas.** O checkout da rematrícula é criado com validade de 1 dia (limite máximo do Asaas), em vez de 1 hora. Cobre o caso comum de "vou pagar mais tarde / vou pedir para meu marido pagar".
2. **Reaproveitamento alinhado.** A janela de reuso do link salvo passa a acompanhar a validade real do checkout, para nunca devolver um link já vencido.
3. **Botão "Gerar novo código PIX".** Na tela de pagamento, quando já existe um checkout aberto, aparece uma opção para gerar um novo — força a criação de um checkout novo no Asaas em vez de reaproveitar o antigo.
4. **Mensagem clara de validade.** Abaixo da opção PIX, aviso de que o código vale por 24 horas e que, se expirar, basta voltar à página e gerar outro.

Nada muda em valores, contrato, ZapSign, webhook de pagamento, eventos, produtos ou renegociação.

## Detalhes técnicos

- `supabase/functions/rematricula-2027-checkout/index.ts`: `minutesToExpire: 60` → `1440`; `CHECKOUT_TTL_MS` → 24h; passar `force_regenerate` (já suportado no código) adiante.
- `src/components/rematricula/StepPagamento.tsx`: enviar `force_regenerate: true` quando o usuário clicar em "Gerar novo código PIX"; texto de validade; estado de erro inalterado.
- A função já grava `checkout_criado_em`, `asaas_checkout_id` e `checkout_url` — nenhuma migration é necessária.

## Caso da Sophia

Sem checkout no banco e contrato não assinado, além do campo de curso 2027 vazio no cadastro dela. Depois do ajuste acima, vale conferir com a secretaria se o cadastro dela precisa ser corrigido (curso 2027) para o fluxo seguir — posso investigar esse registro em seguida se você quiser.
