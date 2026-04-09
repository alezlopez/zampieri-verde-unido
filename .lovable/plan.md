

## Plano: Capturar checkout_url e checkout_id do webhook e exibir ao usuário

### Resumo

O webhook retorna `checkout_url` e um ID de checkout. Vamos salvar ambos na tabela `ingressos`, exibir o link ao usuário após a reserva, e mostrar botão de pagamento em "Meus Ingressos".

---

### 1. Migração: novas colunas em `ingressos`

```sql
ALTER TABLE public.ingressos ADD COLUMN checkout_url text DEFAULT null;
ALTER TABLE public.ingressos ADD COLUMN checkout_id text DEFAULT null;
```

---

### 2. `EventoCompra.tsx` — Capturar resposta do webhook

- Após o `fetch` ao webhook, ler o JSON da resposta (espera-se `{ checkout_url, checkout_id }`)
- Atualizar todos os registros recém-inseridos com `checkout_url` e `checkout_id` via `supabase.from("ingressos").update()`
- Após sucesso, exibir o link de checkout ao usuário (abrir em nova aba ou mostrar botão) em vez de redirecionar direto para "Meus Ingressos"

---

### 3. `MeusIngressos.tsx` — Botão de pagamento

- Incluir `checkout_url` no select da query
- Para ingressos com status `pendente` e `checkout_url` preenchido, exibir botão "Pagar" que abre o link em nova aba
- Agrupar visualmente ingressos do mesmo checkout

---

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Nova migração SQL | Colunas `checkout_url` e `checkout_id` em `ingressos` |
| `EventoCompra.tsx` | Ler resposta do webhook, salvar checkout_url/id, exibir link |
| `MeusIngressos.tsx` | Mostrar botão "Pagar" quando checkout_url disponível |

