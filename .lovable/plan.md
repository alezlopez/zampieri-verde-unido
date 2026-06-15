## Problema
Após o operador clicar em "Confirmar retirada" (produto) ou "Marcar como Utilizado" (ingresso) e a operação ter sucesso, o item permanece na tela agora com status `retirado`/`utilizado` — exibindo o banner vermelho de alerta "ATENÇÃO: já foi retirado/utilizado!". Isso pode confundir o operador, que pode achar que o item já havia sido processado por outra pessoa anteriormente.

## Solução
Alterar os handlers de sucesso para que, após confirmação bem-sucedida, a tela volte ao estado inicial de scan (limpa o card do item e reinicia a câmera automaticamente).

## Alterações

### `markAsUsed` (ingresso)
Linha ~201: ao invés de `setIngresso({ ...ingresso, utilizado: true, ... })` + `toast(...)`, fazer:
1. `toast({ title: "Ingresso marcado como utilizado!" })`
2. `setIngresso(null)`
3. `setError(null)`
4. `startScanner()`

### `confirmarRetiradaProduto` (produto)
Linha ~254: ao invés de `setProduto({ ...produto, status: "retirado", ... })` + `toast(...)`, fazer:
1. `toast({ title: "Produto retirado!", description: ... })`
2. `setProduto(null)`
3. `setError(null)`
4. `startScanner()`

## Notas técnicas
- `startScanner` já está no escopo de closure (incluído nas dependências do `useCallback`).
- Não precisa reiniciar `marking`, pois o `setMarking(false)` já vem em seguida no fluxo atual.
- Em caso de erro (`ja_utilizado`, `ja_retirado`, etc.), o comportamento atual de manter o card com o aviso permanece — isso é correto, pois indica o problema real.