

## Full-Screen Countdown Overlay After Reservation

### What changes
**File: `src/pages/EventoCompra.tsx`**

After a successful reservation, instead of just showing a toast and waiting 10 seconds, display a **full-screen overlay** that:
- Blocks all interaction (fixed overlay with high z-index, pointer-events on the overlay)
- Shows a success message ("Ingressos reservados!")
- Displays a circular countdown timer from 10 to 0
- Shows text like "Redirecionando para Meus Ingressos em X segundos..."
- Has a green/white theme consistent with the app

### Implementation
1. Add state: `redirectCountdown: number | null` (null = not showing, 10→0 = counting)
2. On successful reservation, set `redirectCountdown = 10` instead of using `setTimeout`
3. Use a `useEffect` with `setInterval` that decrements every second; when it hits 0, navigate
4. Render a fixed overlay (`fixed inset-0 z-50 bg-black/60`) with a centered card showing:
   - Check icon
   - "Ingressos reservados com sucesso!"
   - Circular countdown or large number
   - "Redirecionando em {n} segundos..."
5. Remove the toast call and the old `setTimeout`

