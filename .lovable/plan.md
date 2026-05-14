## Diagnóstico

**1. Scan de produto retorna "Comprovante de produto não encontrado"**
- O QR gerado em `/comprovante/:token` tem o payload correto (`prod:<uuid>`).
- A RPC `marcar_produto_retirado(p_qr_token uuid)` existe e funciona.
- Causa provável: o `decodedText` chega com espaço/quebra de linha invisível (comum no html5-qrcode), o `slice(5)` mantém esse lixo, o cast pra UUID falha e cai no `rpcErr` → mostra "não encontrado" genérico.
- Hipótese secundária: usuário não está logado como **admin** no momento do scan (a RPC retorna `sem_permissao`, mas ainda assim o front mostraria "Erro: sem_permissao", não a mensagem atual — então provavelmente é o trim mesmo).

**2. Ingresso utilizado sem badge para o cliente**
- Confirmei no banco: dois ingressos do seu usuário estão com `utilizado=true` e `utilizado_em` preenchido.
- O código em `MeusIngressos.tsx` e `IngressoDetalhe.tsx` já lê e exibe o badge corretamente.
- Causa: cache do navegador / build antigo carregado. Provavelmente um hard refresh resolve, mas vou também garantir que o select e a UI estejam blindados (sem regressão).

## Mudanças

### A) `src/pages/ScannerIngressos.tsx`
1. `decodedText = decodedText.trim()` no início do `handleScan`.
2. Tornar o erro de RPC informativo: em vez de "Comprovante de produto não encontrado.", mostrar o `rpcErr.message` (ex.: "invalid input syntax for type uuid", "permission denied", etc.) — facilita diagnóstico futuro.
3. Mesmo tratamento para o caminho de ingressos (trim).

### B) Confirmar build no cliente
- Pedir hard-refresh (Ctrl+F5) na tela de Meus Ingressos. O código já está correto e os dados estão no banco — basta recarregar.
- Sem alteração de código adicional aqui.

## Validação
- Escanear um QR de produto pago real → deve marcar como retirado.
- Escanear o mesmo QR de novo → "Produto JÁ RETIRADO em ...".
- Logar como cliente e abrir Meus Ingressos / detalhe do ingresso utilizado → badge "Utilizado em DD/MM/AAAA HH:MM" visível e QR substituído pelo aviso.
