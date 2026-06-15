# Scanner — Título + Entrada por Leitor de Código de Barras

## Mudanças em `src/pages/ScannerIngressos.tsx`

### 1. Título
- Trocar `"Scanner de Ingressos"` (h1, linha 280) por **"Scanner de Ingressos e Produtos"**.
- Atualizar também `subtitle` do `<EventosHeader>` (linha 272) para `"Scanner de ingressos e produtos"`.

### 2. Campo de entrada manual (leitor de código de barras USB/Bluetooth)
Leitores de código de barras tipicamente se comportam como teclado: digitam o conteúdo lido num input focado e disparam `Enter` no final. Vamos aproveitar isso.

Adicionar, logo abaixo do botão "Iniciar Scanner" e também visível quando há resultado/erro (sempre disponível):

- Um `<form>` com:
  - `<Input>` (`type="text"`, `placeholder="Leia ou cole o código aqui"`, `autoFocus`, `inputMode="text"`).
  - Botão "Buscar" (submit).
- No `onSubmit`: chamar `handleScan(valor)` e limpar o campo.
- Ao focar/digitar nele, se o scanner por câmera estiver ativo, parar a câmera (`stopScanner()`), para evitar conflito.
- Manter o input visível em todos os estados (idle, erro, resultado de ingresso/produto) — permite o operador apenas apontar o leitor e ler o próximo código sem clicar em nada. Após cada leitura bem sucedida o input é limpo e re-focado.

### 3. Câmera continua igual
- Botão "Iniciar Scanner" + fluxo `Html5Qrcode` permanecem intactos.
- O input manual fica como caminho alternativo/paralelo.

## Layout (idle)

```text
[ Iniciar Scanner (câmera) ]
        — ou —
[ input: Leia/cole o código   ] [Buscar]
```

## Observações técnicas
- `handleScan` já aceita tanto IDs de ingresso (UUID) quanto payloads `prod:<token>` de produto — nenhuma mudança na lógica de busca é necessária.
- Usar `useRef<HTMLInputElement>` para re-focar o input após cada leitura/erro, garantindo que o leitor de código de barras continue funcionando sem cliques.
- Sem alterações em RPCs, banco ou regras de negócio.
