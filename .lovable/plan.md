

## Plano: Bloquear compra duplicada para ingressos pendentes

### Resumo

Antes de permitir a reserva, verificar se o usuário já possui ingressos com status `pendente` para o mesmo evento. Se existirem, bloquear a compra e informar o usuário.

---

### Alterações em `EventoCompra.tsx`

1. **Novo estado**: `ingressosPendentes` — carregado ao montar o componente
2. **Novo useEffect**: Consultar `ingressos` filtrando por `evento_id`, `user_id` e `status = 'pendente'`
3. **Bloqueio na UI**:
   - Se houver ingressos pendentes, exibir aviso no lugar do botão de compra
   - Mostrar link para "Meus Ingressos" para que o usuário possa pagar os pendentes
   - Desabilitar seleção de participantes quando já houver pendentes

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `EventoCompra.tsx` | Consulta de pendentes + bloqueio de UI |

