

## Plano: Controle automático de vagas disponíveis

### Problema atual
O campo `vagas_disponiveis` nos eventos não é atualizado quando ingressos são criados, pagos ou cancelados. O controle precisa ser automático via banco de dados.

### Solução: Trigger no banco de dados

Criar um trigger na tabela `ingressos` que ajusta `vagas_disponiveis` automaticamente:

- **INSERT** com status `pendente` ou `pago` → decrementa `vagas_disponiveis` pela quantidade
- **UPDATE de status para `cancelado`** → incrementa `vagas_disponiveis` (devolve vagas)
- **UPDATE de status de `cancelado` para `pago`/`pendente`** → decrementa novamente
- **DELETE** de ingresso não-cancelado → incrementa (devolve vagas)

### Validação no frontend

Na página de compra (`EventoCompra.tsx`):
- Verificar se `vagas_disponiveis >= totalParticipantes` antes de permitir a reserva
- Exibir vagas disponíveis ao usuário
- Desabilitar botão se não houver vagas suficientes

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Migração SQL | Criar função + trigger em `ingressos` para controlar `vagas_disponiveis` |
| `src/pages/EventoCompra.tsx` | Validar vagas antes de reservar, mostrar vagas disponíveis |
| `src/pages/Eventos.tsx` | Exibir vagas disponíveis nos cards (se não exibe já) |

### Detalhes técnicos — Trigger SQL

```sql
CREATE OR REPLACE FUNCTION public.atualizar_vagas_disponiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- INSERT: novo ingresso não-cancelado diminui vagas
  IF TG_OP = 'INSERT' AND NEW.status != 'cancelado' THEN
    UPDATE eventos SET vagas_disponiveis = vagas_disponiveis - NEW.quantidade
    WHERE id = NEW.evento_id;
  END IF;

  -- UPDATE: mudança de status
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Cancelou → devolve vagas
    IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
      UPDATE eventos SET vagas_disponiveis = vagas_disponiveis + OLD.quantidade
      WHERE id = OLD.evento_id;
    END IF;
    -- Saiu de cancelado → tira vagas
    IF OLD.status = 'cancelado' AND NEW.status != 'cancelado' THEN
      UPDATE eventos SET vagas_disponiveis = vagas_disponiveis - NEW.quantidade
      WHERE id = NEW.evento_id;
    END IF;
  END IF;

  -- DELETE: ingresso não-cancelado → devolve vagas
  IF TG_OP = 'DELETE' AND OLD.status != 'cancelado' THEN
    UPDATE eventos SET vagas_disponiveis = vagas_disponiveis + OLD.quantidade
    WHERE id = OLD.evento_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_atualizar_vagas
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.ingressos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_vagas_disponiveis();
```

### Validação no frontend

Em `EventoCompra.tsx`, antes de inserir, re-fetch o evento para pegar `vagas_disponiveis` atualizado e bloquear se insuficiente. Exibir quantidade disponível na tela de compra.

