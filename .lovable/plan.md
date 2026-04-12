

## Simplificar Termos e Autorização - Popup com Link

### Resumo
Remover as caixas de texto com scroll obrigatório. Substituir por checkboxes simples com links que abrem popups (Dialog) para leitura opcional dos termos e da autorização.

### Mudanças no arquivo `src/pages/EventoCompra.tsx`

**Remover:**
- Estados `termosScrolledToEnd` e `autorizacaoScrolledToEnd`
- Refs `termosRef` e `autorizacaoRef`
- Handlers de scroll (`handleTermosScroll`, `handleAutorizacaoScroll`)
- Mensagens "Role até o final do texto para habilitar o aceite"
- As caixas de texto inline com todo o conteúdo dos termos e da autorização

**Adicionar:**
- Estados `termosDialogOpen` e `autorizacaoDialogOpen` para controlar os popups
- Import do `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle`

**Termos de compra (todos os eventos):**
- Checkbox sempre habilitado + label: `"Li e aceito os "` + link clicavel `"Termos de Compra e Participação"` que abre um Dialog com o conteúdo completo dos termos
- Checkbox obrigatório para reservar

**Autorização (eventos com `requer_autorizacao`):**
- Checkbox sempre habilitado (desde que tenha aluno selecionado) + label: `"Autorizo a participação conforme "` + link clicavel `"texto da autorização"` que abre Dialog com o texto dinâmico da autorização
- Checkbox obrigatório para reservar

**Resultado:** Fluxo mobile-friendly, sem scroll forçado, dois checkboxes obrigatórios com links opcionais para leitura.

