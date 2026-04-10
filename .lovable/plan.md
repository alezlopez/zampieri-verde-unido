

## Plano: Página dedicada de ingresso com QR Code

### Resumo
Criar uma página `/eventos/ingresso/:id` que exibe o ingresso pago como um card visual estilizado com QR Code único, podendo ser salvo como imagem ou compartilhado.

---

### 1. Nova página `src/pages/IngressoDetalhe.tsx`

- Rota: `/eventos/ingresso/:id`
- Busca o ingresso pelo `id` na tabela `ingressos` (com join em `eventos`)
- Se status não for `pago`, mostra mensagem informando que o ingresso ainda não foi confirmado
- Quando `pago`, exibe um card visual estilizado como ingresso contendo:
  - Nome do evento, data, horário e local
  - Nome do participante e tipo (aluno/convidado)
  - QR Code gerado a partir do ID do ingresso (usando biblioteca `qrcode.react`)
  - Badge "PAGO" em destaque
- Botão **"Salvar como imagem"** que usa `html-to-image` para exportar o card como PNG
- Botão **"Compartilhar"** que usa a Web Share API (se disponível) ou copia o link

### 2. Dependências

- `qrcode.react` — gerar QR Code a partir do ID do ingresso
- `html-to-image` — exportar o card como imagem PNG

### 3. Rota no `App.tsx`

- Adicionar: `<Route path="/eventos/ingresso/:id" element={<IngressoDetalhe />} />`

### 4. Link na página `MeusIngressos.tsx`

- Quando o status for `pago`, adicionar um botão **"Ver Ingresso"** que navega para `/eventos/ingresso/:id`

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/pages/IngressoDetalhe.tsx` | Novo — página completa do ingresso com QR Code |
| `src/App.tsx` | Nova rota |
| `src/pages/MeusIngressos.tsx` | Botão "Ver Ingresso" para ingressos pagos |
| `package.json` | Adicionar `qrcode.react` e `html-to-image` |

