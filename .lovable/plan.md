## Objetivo

Aumentar a conversão e a clareza no fluxo de vendas (eventos + produtos) com **navegação unificada**, **upsell pós-compra** e **área única "Minhas compras"** — sem alterar nenhuma regra de negócio, edge function, RLS, schema ou cálculo financeiro existentes.

Mudanças puramente de **frontend + navegação + 1 página de sucesso**.

---

## 1. Menu unificado no header

`EventosHeader` ganha um menu de navegação com as 4 áreas do sistema (visível para usuário logado):

```text
[Eventos]  [Produtos]  [Meus ingressos]  [Meus comprovantes]
```

- Mobile: drawer/menu hambúrguer.
- Item ativo destacado pela rota atual.
- Não-logado: vê apenas Eventos / Produtos + botão Entrar.
- Admin continua com botão "Painel Admin" do lado.

Aplicado em: `Eventos`, `Produtos`, `EventoDetalhe`, `MeusIngressos`, `ComprovanteProduto` e a nova "Minhas compras".

---

## 2. Tela "Minhas compras" unificada

Nova rota `/eventos/minhas-compras` (mantém `/eventos/meus-ingressos` como alias para não quebrar links antigos) com 2 abas:

- **Ingressos** — conteúdo atual de `MeusIngressos`.
- **Comprovantes (produtos)** — lista de `pedidos_produtos` do usuário, com:
  - Nome do produto + variação, qtd, valor.
  - Status colorido (pendente / pago / retirado / cancelado / estornado).
  - Botão "Ver comprovante" (→ `/comprovante/:qr_token`) quando `pago`.
  - Botão "Pagar" (abre `checkout_url`) quando `pendente`.
  - Selo "Retirado" quando `status='retirado'`, com data/hora.

Sem nenhuma alteração nas tabelas — apenas SELECT do que já existe.

---

## 3. Upsell pós-checkout (a peça-chave)

Hoje, após criar o checkout, o cliente é jogado direto pro Asaas. Após pagar (ou cancelar), a `successUrl` aponta direto pra `/eventos/meus-ingressos`. Vamos inserir uma **tela intermediária de sucesso** com upsell.

### Fluxo novo

1. Cliente conclui pagamento no Asaas.
2. Asaas redireciona para **`/eventos/sucesso?ref=<checkout_id>&tipo=ingresso|produto`** (nova rota).
3. Página "sucesso" mostra:
   - Confirmação visual (✓ "Pagamento recebido — em até 5 min seu ingresso/comprovante estará liberado em Minhas compras").
   - Resumo do pedido (busca pelos próprios checkout_id em `ingressos` ou `pedidos_produtos`).
   - **Bloco "Você também pode gostar"** — produtos vinculados ao mesmo `evento_id` (via `evento_produtos`) que ainda não estão no pedido; se for compra avulsa de produto, mostra outros produtos `is_global=true`.
   - CTAs: **"Adicionar ao meu pedido"** (abre `/eventos/:id/produtos` ou `/produtos` já com o produto sugerido pré-selecionado via querystring) e **"Ir para Minhas compras"**.

### Onde mexer

- Edge functions `asaas-create-checkout` e `produtos-create-checkout`: trocar `successUrl` para a nova rota `/eventos/sucesso?...` (mesma URL, nada muda no cálculo). É a **única mudança de backend**, e é apenas o destino da `successUrl`.
- Nova página `src/pages/CompraSucesso.tsx`.

Sem mudar webhook, RLS, schema, valores ou external references.

---

## 4. Cross-promo no detalhe do evento

Em `EventoDetalhe.tsx`, abaixo do bloco de compra/CTAs, adicionar **"Produtos extras deste evento"**: cards horizontais dos produtos em `evento_produtos` daquele evento, com botão "Comprar à parte" → `/eventos/:id/produtos`.

Se o evento não tiver produtos vinculados, o bloco simplesmente não aparece (zero impacto).

---

## 5. Entrada de "Produtos" a partir de `/eventos`

Banner enxuto entre o hero e a grid de eventos: "🎁 Confira também nossos produtos avulsos" → link `/produtos`. Só renderiza se houver pelo menos 1 produto `is_global=true`.

---

## 6. Refinamentos visuais menores

- `MeusIngressos`: status com ícone (✓ pago, ⏳ pendente, 🚫 cancelado).
- Card de ingresso pago ganha mini-preview do QR (já há `IngressoDetalhe`).
- `Produtos`: badges "Mais vendido" / "Estoque baixo" quando `disponivel < 10` (usa RPC já existente `contar_estoque_produto`).
- Toast de sucesso após adicionar ao carrinho.

---

## Garantias de não-regressão

- Nenhuma mudança em: schema, RLS, triggers, webhook, cálculo de líquido, formato de `externalReference`, fluxo de checkout do Asaas, autenticação/CPF.
- `successUrl` apenas troca de destino — quem já paga e cai em `/eventos/meus-ingressos` continua funcionando (a nova `/eventos/sucesso` redireciona pra lá depois).
- Rotas atuais permanecem (`/eventos/meus-ingressos`, `/comprovante/:token`, `/produtos`, `/eventos/:id/produtos`).
- Scanner da portaria continua igual (já lê tanto ingresso quanto produto).

---

## Entregas em ordem

1. Menu unificado no header (`EventosHeader` + uso nas páginas).
2. Página `CompraSucesso` + ajuste das 2 `successUrl`s nas edge functions.
3. Aba "Comprovantes" em `MeusIngressos` (renomear visualmente para "Minhas compras").
4. Bloco de produtos extras em `EventoDetalhe`.
5. Refinamentos visuais (badges, ícones de status, toast).
