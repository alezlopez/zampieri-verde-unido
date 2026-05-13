## Objetivo

Adicionar venda de **produtos com variações** (ex.: cartelas de bingo) que podem ser:
- comprados como **add-on** dentro do checkout de um evento, ou
- comprados **avulsos** (sem ingresso de evento).

Cada item gera **1 QR de retirada por linha de pedido** (ex.: 5 cartelas = 1 QR com quantidade 5), validado na portaria de forma análoga à validação de meia-entrada de ingresso.

Sem alterar o fluxo atual de eventos/ingressos.

---

## Arquitetura

### Banco (novas tabelas)

```text
produtos
  id, nome, descricao, imagem_url, ativo,
  estoque_controlado (bool), estoque_total (int|null),
  is_global (bool)        -- aparece em catálogo avulso
  created_at, updated_at

produto_variacoes
  id, produto_id, nome (ex: "Cartela simples"),
  preco, preco_parcelado, max_parcelas,
  estoque_total (int|null),     -- opcional por variação
  ativo

evento_produtos              -- vincula produto a um evento (opcional)
  id, evento_id, produto_id, ordem, ativo
  unique (evento_id, produto_id)

pedidos_produtos             -- 1 linha por variação no carrinho
  id, user_id, evento_id (nullable), produto_id, variacao_id,
  nome_comprador, cpf_comprador,
  quantidade, valor_unitario, valor_total,
  status ('pendente'|'pago'|'cancelado'|'estornado'|'retirado'),
  forma_pagamento, parcelas,
  asaas_payment_id, asaas_customer_id,
  checkout_id, checkout_url,
  valor_bruto, valor_liquido, taxa_total,
  data_pagamento, data_credito,
  retirado_em, retirado_por,
  qr_token (uuid único, usado no QR),
  created_at
```

Triggers:
- `validar_estoque_pedido_produto` — se `estoque_controlado`, conta `pedidos_produtos` com status `pendente|pago|retirado` e bloqueia excedente (mesma lógica de cota de meia).
- RPC `contar_estoque_produto(produto_id, variacao_id)` para frontend.

RLS:
- `produtos` / `produto_variacoes` / `evento_produtos`: SELECT público em `ativo=true`; ALL para admin.
- `pedidos_produtos`: SELECT/INSERT do próprio usuário; admin tudo.

### Edge functions (novas/alteradas)

**Novas**
- `produtos-create-checkout` — recebe `{ itens: [{variacao_id, qtd}], evento_id?, forma_pagamento, parcelas? }`, valida estoque, cria pedidos pendentes, monta `items` Asaas (1 item por variação) e cria checkout. Reaproveita `_shared/asaas.ts` (sem mudanças).

**Alteradas**
- `asaas-create-checkout` (ingressos): aceita parâmetro opcional `produto_itens` para incluir add-ons no **mesmo** checkout. Cria registros em `pedidos_produtos` e adiciona items Asaas. `externalReference` passa a ser `"ing:id1,id2|prod:p1,p2"` (parser atualizado).
- `_shared/financeiro.ts`: parser do `externalReference` reconhece prefixos `ing:` e `prod:` e roteia o rateio bruto/líquido entre as duas tabelas (proporcional ao `valor_total`). Sem prefixo = comportamento antigo (compat).
- `asaas-webhook`: ao confirmar pagamento, marca `pedidos_produtos.status='pago'` além dos ingressos.

### Frontend

- **Admin** (`EventosAdmin.tsx` ou nova `/eventos/admin/produtos`):
  - CRUD de `produtos` + `produto_variacoes`.
  - No editor de evento: aba "Produtos extras" para anexar produtos via `evento_produtos`.
- **EventoCompra.tsx**: nova seção "Produtos extras" lista produtos vinculados ao evento. Cliente escolhe variação + qtd. Total atualiza junto com ingressos. Bloco isolado, sem alterar lógica de participantes.
- **Nova página `/eventos/:id/produtos`** (e `/produtos` para catálogo global): permite comprar só produtos.
- **MeusIngressos**: nova aba "Meus comprovantes" listando `pedidos_produtos` com QR (link para `/comprovante/:qr_token`).
- **Nova página `/comprovante/:qr_token`**: mostra QR + dados (compatível com `ScannerIngressos`).
- **ScannerIngressos**: detecta tokens de produto (prefixo `prod_` no payload do QR) e marca `retirado_em` via RPC `marcar_produto_retirado`.

---

## Garantias de não-regressão

- Nenhum schema existente alterado (apenas adições).
- Fluxos atuais sem `produto_itens` continuam idênticos.
- `externalReference` sem prefixo trata como ingresso (legado).
- Tabela `ingressos` intocada — produtos vivem em `pedidos_produtos`.
- Admin/relatórios financeiros: relatório atual segue funcionando; em passo futuro pode somar `pedidos_produtos`.

---

## Entregas em ordem

1. Migration: tabelas + RLS + triggers de estoque.
2. Edge function `produtos-create-checkout` + alteração de `_shared/financeiro.ts`.
3. Webhook Asaas reconhece pedidos de produto.
4. Admin: CRUD produtos/variações + vínculo a evento.
5. Frontend: seção add-on em `EventoCompra` + página avulsa.
6. Comprovante + scanner.
