
# Order bumps: produto relacionado no checkout do evento

## Objetivo
Aumentar conversão oferecendo produtos vinculados ao evento já dentro da página de compra do ingresso, em um único checkout Asaas, mantendo comprovantes separados (1 por ingresso + 1 por pedido de produto).

## 1. Banco (migration)

**`evento_produtos`** — novas colunas para controle por evento/produto:
- `pre_selecionado boolean default false` — se já vem marcado no checkout
- `variacao_padrao_id uuid` (nullable) — qual variação aparece pré-marcada
- `qtd_padrao integer default 1` — quantidade pré-marcada
- `destaque_label text` (nullable) — texto opcional tipo "🔥 Mais vendido", "Combo do evento"

Sem mudança de RLS.

## 2. Admin de evento_produtos (EventosAdmin)
No painel onde já existe a vinculação de produtos a eventos, adicionar:
- Toggle "Pré-marcar no checkout"
- Select de variação padrão (lista variações ativas do produto)
- Input numérico "Qtd padrão"
- Input texto "Destaque" (opcional)

## 3. UI — EventoCompra.tsx

Nova seção **"Leve junto"** entre os participantes e o resumo:
- Aparece só se houver `evento_produtos` ativos para esse evento.
- Cada produto mostra imagem, nome, variações (radio) e stepper de qtd.
- Itens com `pre_selecionado=true` já vêm marcados com `variacao_padrao_id` e `qtd_padrao`.
- Badge de destaque renderiza `destaque_label` se setado.
- Sempre opcional: usuário pode desmarcar ou trocar variação/qtd.

Resumo lateral passa a somar ingressos + extras, com linha "Produtos adicionados".

## 4. Nova edge function `checkout-evento-combo`

Substitui a chamada a `asaas-create-checkout` quando há extras (mantém a antiga intacta para fluxos sem produto). Recebe:
```
{ ingresso_ids: [...], extras: [{ variacao_id, quantidade }], forma_pagamento, parcelas }
```

Fluxo:
1. Valida ingressos do usuário (mesma lógica de `asaas-create-checkout`).
2. Valida variações + estoque (mesma lógica de `produtos-create-checkout`).
3. Calcula `max_parcelas` como o mínimo entre evento e todas variações.
4. Cria `pedidos_produtos` pendentes vinculados ao mesmo `evento_id`.
5. Cria **um único** checkout Asaas com `items` combinando ingressos e produtos.
6. `externalReference` no formato `mix:ing=id1,id2;prod=id3,id4`.
7. Grava `checkout_url/checkout_id` em ambas as tabelas.

## 5. Webhook `asaas-webhook`

Adicionar parser para `externalReference` começando com `mix:`:
- Extrai lista de `ingresso_ids` e `pedido_ids` separadamente.
- Reaproveita os handlers existentes (atualiza status `pago`/`estornado` em cada tabela independentemente).
- Comprovantes/e-mails continuam disparando por entidade — nada muda do lado do usuário, ele recebe os comprovantes separados (ingresso + pedido) como hoje.

## 6. Página de sucesso e Meus Ingressos
- `successUrl` passa a ser `/eventos/sucesso?tipo=combo&evento=...` quando há mix.
- Página de sucesso lista ingressos E pedidos do checkout (consulta por `checkout_id`).
- "Meus ingressos" já lista ambos separadamente — sem mudança.

## 7. Estorno (decisão: independente)
- `cancelar-ingresso` permanece como está; admin estorna ingresso e produto em ações separadas.
- Como o Asaas permite refund parcial sobre uma cobrança, ao estornar um item o helper já calcula o valor proporcional desse item (`valor_total` da linha). Validar no helper de refund que ele aceita `value` parcial — já aceita (`refundPayment({ value })`).

## Detalhes técnicos
- Idempotência: se o usuário voltar do checkout sem pagar, reaproveitar URL (mesma lógica TTL 60min já usada nas duas funções).
- Estoque: revalidar via `contar_estoque_produto` no momento do POST (race protection).
- Validação Zod completa no body da nova função.
- Sem mudanças em `produtos-create-checkout` nem em `asaas-create-checkout`; a nova função só é invocada quando `extras.length > 0`.

## Arquivos afetados
- `supabase/migrations/<novo>.sql`
- `supabase/functions/checkout-evento-combo/index.ts` (novo)
- `supabase/functions/asaas-webhook/index.ts` (parser `mix:`)
- `src/pages/EventoCompra.tsx` (seção "Leve junto" + nova chamada)
- `src/pages/EventosAdmin.tsx` (campos de pré-seleção em evento_produtos)
- `src/pages/CompraSucesso.tsx` (suporte a `tipo=combo`)
- `src/integrations/supabase/types.ts` (auto após migration)
