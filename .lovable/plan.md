

## Plano: Campo "Excursão" no evento + Observação no QR Code + Scanner admin

### 1. Migração de banco de dados

Adicionar duas novas colunas na tabela `eventos`:
- `is_excursao` (boolean, default false) — indica se o evento é excursão

Adicionar nova coluna na tabela `ingressos`:
- `utilizado` (boolean, default false) — controle de ingresso já utilizado/escaneado

```sql
ALTER TABLE public.eventos ADD COLUMN is_excursao boolean NOT NULL DEFAULT false;
ALTER TABLE public.ingressos ADD COLUMN utilizado boolean NOT NULL DEFAULT false;
```

### 2. Formulário admin (`EventosAdmin.tsx`)

- Adicionar checkbox "Evento é excursão?" no formulário de criação/edição
- Novo state `isExcursao` e inclusão no payload de save/edit
- Incluir no `handleEdit` para carregar valor existente

### 3. Observação no ingresso (`IngressoDetalhe.tsx`)

- Buscar campo `is_excursao` do evento junto com o select (adicionar ao join: `eventos(titulo, data_evento, horario, local, is_excursao)`)
- Abaixo do QR Code, exibir um box destacado:
  - **Se excursão**: "Este QR Code não é válido para entrada no local da excursão. Deve ser apresentado na escola para efetivo controle do participante. O ingresso para entrada no evento será entregue pela escola no local do evento."
  - **Se não excursão**: "Obrigatória a apresentação deste ingresso na entrada do evento."
- Estilo: fundo amarelo/âmbar claro com ícone de alerta para fácil leitura

### 4. Página de scanner QR Code para admin (`ScannerIngressos.tsx`)

- Nova página `/eventos/admin/scanner` acessível apenas por admins
- Usa a câmera do dispositivo para ler QR Codes (biblioteca `html5-qrcode`)
- Ao escanear, busca o ingresso pelo ID no banco
- Exibe dados do ingresso (nome, evento, status)
- Botão para marcar como "utilizado" (update na coluna `utilizado`)
- Se já utilizado, exibe alerta vermelho
- Adicionar link/botão no painel admin para acessar o scanner

### 5. Rota no `App.tsx`

- Adicionar: `<Route path="/eventos/admin/scanner" element={<ScannerIngressos />} />`

### Dependências

- `html5-qrcode` — leitura de QR Code via câmera

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Migração SQL | Adicionar `is_excursao` em eventos e `utilizado` em ingressos |
| `src/pages/EventosAdmin.tsx` | Checkbox "Excursão" no form + botão scanner |
| `src/pages/IngressoDetalhe.tsx` | Observação condicional abaixo do QR Code |
| `src/pages/ScannerIngressos.tsx` | Nova página — scanner QR admin |
| `src/App.tsx` | Nova rota scanner |
| `package.json` | Adicionar `html5-qrcode` |

