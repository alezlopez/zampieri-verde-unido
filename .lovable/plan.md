## Plano: corrigir vagas, reduzir reserva para 1h e exibir prazo no frontend

### 1. Corrigir vagas do evento `87f20c66…`

Estado atual no banco:
- `vagas_total = 100`, `vagas_disponiveis = 212` (incoerente — sobra do total antigo de 300)
- Ingressos não-cancelados: **88** (87 pagos + 1 pendente)
- Valor correto: `vagas_disponiveis = 100 − 88 = 12`

**Migration** (UPDATE pontual):
```sql
UPDATE eventos
   SET vagas_disponiveis = vagas_total - (
       SELECT COALESCE(SUM(quantidade), 0)
         FROM ingressos
        WHERE evento_id = eventos.id
          AND status NOT IN ('cancelado','estornado')
   )
 WHERE id = '87f20c66-bbe0-48b2-84f3-d47008f12136';
```

Para evitar repetir esse problema no futuro, o admin (`EventosAdmin.tsx > handleSave`) passa a recalcular automaticamente `vagas_disponiveis` quando `vagas_total` é alterado em uma edição — usando a mesma fórmula `total − ocupados_não_cancelados`, garantindo que nunca fique negativo.

### 2. Esgotamento bloqueia novas compras?

**Sim**, já está implementado:
- `Eventos.tsx` e `EventoDetalhe.tsx`: quando `vagas_disponiveis <= 0` mostram badge **ESGOTADO** e ocultam o botão de compra.
- `EventoCompra.tsx` revalida vagas antes de gravar (rejeita se `qtd > vagas_disponiveis`).
- O trigger `atualizar_vagas_disponiveis` decrementa no INSERT (status pendente já reserva) e devolve no cancelamento/estorno.

Nada a alterar aqui — apenas confirmação.

### 3. Reduzir reserva de 24h → 1h sem quebrar o checkout Asaas

**Como funciona hoje:**
- Ingresso fica `pendente` indefinidamente até o cron `cancelar-pendentes-15min` rodar (a cada 15 min) e cancelar tudo com `created_at < now()-2h`.
- O checkout Asaas é criado com `minutesToExpire: 1440` (24h).
- O `asaas-create-checkout` reusa o link enquanto `Date.now()-checkout_criado_em < 24h`; depois disso, regenera automaticamente.

**Risco se baixarmos só o cron para 1h:** o cliente pode pagar no link Asaas (ainda válido por 24h) **depois** que o ingresso foi cancelado pelo cron — o webhook `PAYMENT_CONFIRMED` chega mas o ingresso está `cancelado`, e a vaga já pode ter sido vendida a outro.

**Plano (alinhar todos os prazos em 60 min):**

| Componente | Hoje | Novo |
|---|---|---|
| Cron `cancelar-pendentes` cutoff | 2h | **60 min** |
| Asaas `minutesToExpire` (ingressos) | 1440 | **60** |
| Asaas `minutesToExpire` (produtos) | (verificar — provavelmente 1440) | **60** |
| `CHECKOUT_TTL_MS` (reuso/regeneração) | 24h | **60 min** |
| Frequência do cron | a cada 15 min | **a cada 5 min** (para fechar a janela) |

Com isso:
- Quando o ingresso é cancelado, o link Asaas já expirou (ou expira em segundos) → não há pagamento órfão chegando depois.
- Como já temos regeneração automática (`shouldRegenerate = isExpired`), se o usuário voltar mais tarde via "Meus Ingressos" e o ingresso ainda existir como `pendente` (janela curta), o sistema gera um novo checkout. Se já estiver `cancelado`, ele aparece com aviso e o usuário refaz a compra (fluxo já existente).
- **Defesa extra no webhook:** em `asaas-webhook` (handlers de `PAYMENT_CONFIRMED` / `CHECKOUT_PAID`), se o ingresso estiver `cancelado` quando o pagamento chegar, **reverter** para `pago` somente se `vagas_disponiveis > 0`; caso contrário, marcar `pago` mesmo assim mas registrar log de overbooking (1 vaga acima do limite é melhor que perder o pagamento — admin trata manualmente). Hoje não há essa proteção.

### 4. Comunicar o prazo no frontend

- **`EventoCompra.tsx`**: trocar o texto "será cancelada automaticamente após **2 horas**" por **"60 minutos"**.
- **Tela de confirmação ("Ingressos reservados!")** e **`MeusIngressos.tsx`** (cards de pendentes): adicionar contador/aviso visível:
  > ⏱ Reserva válida até **HH:MM** — pague em até 60 min para garantir suas vagas.
  
  Calculado como `created_at + 60min`. Se já expirou, exibir "Reserva expirada — gerar novo checkout" (botão já existente).
- **`EventoDetalhe.tsx`**: nota informativa logo acima do botão de compra: "A reserva fica válida por 60 minutos para conclusão do pagamento."
- **Termo de Compra (cláusula 3)**: atualizar o texto de "2 horas" para "60 minutos" para manter consistência legal.

### Arquivos afetados

```
supabase/migrations/<novo>.sql            -- corrige vagas + (se quiser) reagendar cron
supabase/functions/cancelar-pendentes/index.ts          -- cutoff 2h → 60min
supabase/functions/asaas-create-checkout/index.ts       -- minutesToExpire/TTL → 60
supabase/functions/produtos-create-checkout/index.ts    -- minutesToExpire/TTL → 60
supabase/functions/asaas-webhook/index.ts               -- recover se status=cancelado
src/pages/EventosAdmin.tsx                              -- recalcular vagas no UPDATE
src/pages/EventoCompra.tsx                              -- texto + aviso 60min
src/pages/EventoDetalhe.tsx                             -- aviso 60min
src/pages/MeusIngressos.tsx                             -- contador "válido até HH:MM"
src/components/TermoCompra.tsx (ou onde estiver)        -- cláusula 3
```

### Confirmações antes de implementar

1. Confirma **60 min** em todos os pontos (cron + Asaas + UI + termo)?
2. Aplico a defesa "recuperar pagamento órfão mesmo se cancelado" no webhook (item 3, último parágrafo)?
3. Aumento a frequência do cron de 15min → 5min para fechar a janela de risco?