

## Fix: Allow reserving tickets for different students even with pending tickets

### Problem
When a user has a pending ticket for **aluno A**, the system blocks reserving tickets for **aluno B** entirely. Two separate mechanisms cause this:

1. **`alunosComIngresso` array** (line 141-144): Collects ALL `codigo_aluno` from tickets with status `pendente` or `pago` — this correctly disables the checkbox per-aluno. This part works fine.

2. **`ingressosPendentes` check** (line 569): When `ingressosPendentes.length > 0`, the entire "Reservar" button is hidden and replaced with a "finalize payment first" warning. This is the bug — it blocks ALL new reservations globally regardless of which aluno they're for.

### Solution
**File: `src/pages/EventoCompra.tsx`**

Remove the global block based on `ingressosPendentes.length > 0`. Instead:
- Keep the per-aluno blocking via `alunosComIngresso` (already working)
- Show the pending tickets warning as an **informational banner** (not blocking), so the user is aware they have pending tickets
- Always show the "Reservar" button as long as the user has selected at least one aluno that doesn't already have a ticket
- The button should be disabled only if no valid participants are selected (all selected alunos already have tickets, or nothing selected)

### Changes
1. Move the pending tickets warning from the button area to an informational section above
2. Always render the "Reservar Ingressos" button regardless of pending tickets
3. Keep the per-aluno checkbox disabling logic unchanged

