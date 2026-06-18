## Objetivo
Criar um novo nível de acesso chamado **conferente**, que pode usar o Scanner de Ingressos e Produtos (validar meia, marcar utilizado, marcar retirado) e ver o nome do comprador, **sem enxergar valores monetários**.

## 1. Banco de dados (migração)

### Enum de papéis
- `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'conferente';`

### Funções RPC já existentes
As funções `marcar_ingresso_utilizado`, `validar_meia_ingresso` e `marcar_produto_retirado` hoje exigem `has_role(uid, 'admin')`. Vou alterá-las para aceitar `admin` **ou** `conferente`.

### Leitura de dados sem valores
Para o conferente conseguir buscar ingresso/produto pelo QR sem expor valores, vou criar duas RPCs `SECURITY DEFINER` que retornam apenas os campos seguros (sem `valor`, `valor_total`, `valor_unitario`, descontos etc.):

- `buscar_ingresso_scan(p_codigo text)` → retorna id, evento, nome_comprador, nome_participante, tipo_ingresso, status, utilizado, utilizado_em, meia_validada_portaria.
- `buscar_produto_scan(p_qr_token uuid)` → retorna pedido_id, produto, variação, quantidade, nome_comprador, status, evento, retirado_em.

Ambas permitidas para `admin` ou `conferente`. O frontend do scanner passa a usar essas RPCs em vez de `select` direto nas tabelas — isso garante que mesmo se o conferente tentar ler `ingressos`/`pedidos_produtos` direto, as policies atuais (restritas a admin/dono) bloqueiam.

## 2. Frontend

### `AuthContext.tsx`
- Adicionar `isConferente: boolean` ao contexto, carregado via `has_role(uid, 'conferente')` em paralelo ao `isAdmin`.
- Expor um helper `canScan = isAdmin || isConferente`.

### `ScannerIngressos.tsx`
- Trocar a checagem `!isAdmin` por `!canScan` no guard de rota.
- Substituir os `select` atuais em `ingressos`/`pedidos_produtos` pelas novas RPCs `buscar_ingresso_scan` e `buscar_produto_scan`, removendo qualquer referência a campos de valor na UI (a tela já mostra só nome/tipo/status, então a mudança é mínima).

### Navegação
- Em `Eventos.tsx`/menu admin, o link "Scanner" passa a aparecer para `canScan` (admin ou conferente). Links de Admin/Relatório continuam só para `isAdmin`.

## 3. Como atribuir o papel
Você atribui manualmente no Supabase:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<uuid-do-usuario>', 'conferente');
```

## Detalhes técnicos
- Enum `app_role`: hoje `('admin','user')`, fica `('admin','user','conferente')`.
- Policies de `ingressos` e `pedidos_produtos` **não mudam** — o conferente só acessa via RPC SECURITY DEFINER, então nunca vê colunas de valor.
- Nenhuma alteração em fluxos de compra, pagamento ou relatórios.
