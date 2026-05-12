## Objetivo

Tornar o cadastro de evento robusto para a Lei da Meia-Entrada (Lei 12.933/2013), garantir que **à vista** e **parcelado** funcionem corretamente no checkout Asaas, e blindar o fluxo contra falhas (validação, idempotência, cota).

Decisões já travadas:
- **Meia-entrada por declaração** + conferência do documento na portaria (Scanner QR).
- **Cota fixa de 40%** das vagas totais reservada para meia.
- **Categorias**: Estudante, Idoso 60+, PCD + acompanhante, Professor rede pública.

---

## 1. Banco de dados

### Novos campos em `eventos`
- `meia_entrada_habilitada boolean default true` — admin pode desligar para eventos institucionais (não comerciais, isentos da lei).
- `percentual_meia integer default 40` — fica fixo em 40 mas exposto para futuro ajuste.
- `preco_meia numeric` — valor calculado automaticamente como `preco / 2`, persistido para histórico.
- `preco_meia_parcelado numeric` — `preco_parcelado / 2`.

### Novos campos em `ingressos`
- `tipo_ingresso text default 'inteira' check in ('inteira','meia')`.
- `categoria_meia text` — `estudante` | `idoso` | `pcd` | `pcd_acompanhante` | `professor` (null se inteira).
- `declaracao_meia_aceita boolean default false` + `declaracao_meia_aceita_em timestamptz` — registro legal da declaração.
- `meia_validada_portaria boolean default false` + `meia_validada_em timestamptz` + `meia_validada_por uuid` — preenchido pelo Scanner.

### Nova RPC `contar_meias_evento(p_evento_id uuid)` (SECURITY DEFINER)
Retorna `{ vagas_total, vagas_meia_total, meias_vendidas, meias_disponiveis }`. Usada pelo frontend e pela edge function para enforcement da cota antes de gerar checkout.

```text
vagas_meia_total = floor(vagas_total * percentual_meia / 100)
meias_vendidas   = count(ingressos where tipo_ingresso='meia' and status in ('pendente','pago'))
```

### Trigger `validar_cota_meia` em `ingressos` (BEFORE INSERT)
Se `tipo_ingresso = 'meia'`, recalcula `meias_vendidas` para o evento e bloqueia o INSERT com erro `cota_meia_esgotada` se passar de `vagas_meia_total`. Defesa de última camada — frontend e edge function também checam antes.

---

## 2. Formulário de evento (`EventosAdmin.tsx`)

Reorganizar em **5 seções colapsáveis** com validação Zod por seção. Sem mudar nada que já funciona — só reagrupando + acrescentando o bloco de meia.

```text
┌─ 1. Identificação ──────────────────┐
│  Título* | Data* | Horário | Local  │
│  Descrição | Imagem (upload)        │
└─────────────────────────────────────┘
┌─ 2. Vagas e público ────────────────┐
│  Total de vagas* | Público-alvo*    │
│  Requer autorização | É excursão    │
└─────────────────────────────────────┘
┌─ 3. Preço inteira ──────────────────┐
│  Preço à vista*                     │
│  Preço parcelado | Máx parcelas     │
│  → Preview: "1× R$ X" e "Nx R$ Y"   │
└─────────────────────────────────────┘
┌─ 4. Meia-entrada (Lei 12.933) ──────┐
│  [✓] Habilitar meia-entrada         │
│  Cota: 40% = N de M vagas (read-only)│
│  Preço meia à vista (auto: /2)      │
│  Preço meia parcelado (auto: /2)    │
│  Categorias aceitas (multi-select)  │
│  Texto de aviso: "Documento exigido │
│   na portaria conforme Lei 12.933"  │
└─────────────────────────────────────┘
┌─ 5. Compatibilidade ────────────────┐
│  Ativo | (tipo_evento legacy oculto)│
└─────────────────────────────────────┘
```

Validações no submit:
- `preco_parcelado >= preco` quando há parcelamento (juros embutidos OK; desigualdade impede preço parcelado abaixo do à vista por engano).
- `max_parcelas` entre 1 e 12.
- `vagas_total > 0`.
- Se `meia_entrada_habilitada`, exigir ao menos 1 categoria selecionada.
- Confirmação obrigatória antes de **diminuir** `vagas_total` em evento que já tem ingressos (refazer o cálculo de cota).

---

## 3. Tela de compra (`EventoCompra.tsx`)

### Bloco novo: "Tipo de ingresso por participante"

Para cada aluno selecionado **e** cada convidado adicionado, aparece um sub-bloco:

```text
┌─ João Silva (aluno) ────────────────┐
│  ( ) Inteira — R$ 50,00             │
│  (•) Meia — R$ 25,00                │
│       Categoria: [Estudante ▾]      │
│       [✓] Declaro que apresentarei  │
│            documento na portaria     │
│            conforme Lei 12.933/2013  │
│       ⚠ Sem documento = pago a       │
│         diferença ou não entra       │
└─────────────────────────────────────┘
```

Regras:
- Botão "Comprar" desabilitado enquanto qualquer meia estiver sem categoria + declaração aceita.
- Antes de inserir os ingressos, chamar `contar_meias_evento` e bloquear se a soma de meias do carrinho > `meias_disponiveis`. Mensagem clara: "Restam X meias para este evento. Reduza ou troque para inteira."
- O preço total é recalculado dinamicamente: soma de inteiras × `preco`/`preco_parcelado` + soma de meias × `preco_meia`/`preco_meia_parcelado`.
- Indicador visual da cota: "Meias disponíveis: 14 de 40".

---

## 4. Edge Function `asaas-create-checkout`

Mudanças:
1. **Recalcular `valorTotal` no servidor** somando `preco_meia` para ingressos `tipo_ingresso='meia'` e `preco`/`preco_parcelado` para `inteira`. Nunca confiar no preço enviado pelo cliente.
2. **Re-checar cota de meias** com `contar_meias_evento` antes de criar a cobrança. Se estourou (race condition entre carrinho e outro comprador), retorna 409 `cota_meia_esgotada` e o frontend orienta o usuário a trocar para inteira.
3. **Parcelado robusto**: já existe (`installmentCount` + `totalValue`). Vou ajustar para:
   - `installmentCount` só é enviado se `parcelas > 1` E `forma_pagamento === 'credit_card'`.
   - PIX nunca recebe `installmentCount` (Asaas rejeita).
   - `totalValue` é o valor total parcelado (com juros, vindo de `preco_parcelado × qtd`); `value` continua o unitário do parcelamento.
4. **Validação Zod** do body (`ingresso_ids`, `forma_pagamento`, `parcelas` 1-12).
5. **Logs estruturados** com `evento_id`, `qtd_inteira`, `qtd_meia`, `valor_total` para auditoria.

---

## 5. Scanner QR (`ScannerIngressos.tsx`)

Adicionar, ao escanear ingresso `tipo_ingresso='meia'`:
- Badge vermelho "MEIA — exige documento".
- Mostra `categoria_meia` ("Estudante", "Idoso 60+", etc).
- Botão "Documento conferido — liberar entrada" → marca `meia_validada_portaria=true`, `meia_validada_em=now()`, `meia_validada_por=auth.uid()`.
- Botão "Documento inválido — cobrar diferença" → mantém o ingresso utilizado=false e abre modal com instrução para o operador.

Sem isso a portaria fica cega; é o que fecha o ciclo legal da declaração.

---

## 6. Painel admin — relatório de meias

Na lista de ingressos do evento (`EventosAdmin.tsx`), adicionar:
- Coluna "Tipo" (Inteira / Meia + categoria).
- Coluna "Validado portaria" (✓/✗) para meias.
- Filtro "Apenas meias não validadas" — útil pós-evento para auditar.
- Resumo no topo: "X inteiras vendidas | Y meias vendidas (Z% da cota)".

---

## 7. Compatibilidade com eventos existentes

- Migration usa `DEFAULT` em todos os novos campos → eventos antigos continuam funcionando idênticos.
- `meia_entrada_habilitada=true` por default, mas como `preco_meia` é calculado no salvar, eventos antigos só passam a oferecer meia depois que admin reabrir e salvar (ou por backfill `UPDATE eventos SET preco_meia = preco/2, preco_meia_parcelado = preco_parcelado/2 WHERE preco_meia IS NULL` que rodará na própria migration).
- Ingressos antigos: `tipo_ingresso='inteira'` por default, sem alterar nada.
- `tipo_evento` (legacy) continua no banco mas nunca mais é editado pelo formulário (já removido na rodada anterior).

---

## 8. Robustez ("100% de funcionamento")

Camadas de defesa:
1. **Frontend**: validação Zod nos formulários, botões desabilitados em estado inválido, recálculo de cota antes do submit.
2. **Edge function**: revalidação completa (preço, cota, ownership), Zod no body, idempotência via `asaas_payment_id`.
3. **Banco**: trigger `validar_cota_meia`, CHECK em `tipo_ingresso`, RLS já existente em `ingressos`.
4. **Reconciliação**: botões "Reconciliar pagamento" e "Gerar checkout" no admin já existem e continuam funcionando.
5. **Webhook Asaas**: já idempotente, sem mudança.

---

## 9. Ordem de execução

1. Migration: novos campos em `eventos` + `ingressos`, trigger `validar_cota_meia`, RPC `contar_meias_evento`, backfill de `preco_meia`.
2. Refatorar `EventosAdmin.tsx` em seções + bloco de meia + validação Zod.
3. Adicionar bloco "Tipo de ingresso" em `EventoCompra.tsx` com cálculo dinâmico e bloqueio de cota.
4. Atualizar `asaas-create-checkout` para recalcular preço, validar cota e blindar parcelado/PIX.
5. Atualizar `ScannerIngressos.tsx` com validação de meia.
6. Adicionar coluna "Tipo" e resumo de meias em `EventosAdmin.tsx` (lista de ingressos).
7. Teste end-to-end: criar evento com meia → comprar 1 inteira PIX, 1 meia cartão parcelado, esgotar cota, validar na portaria.

---

## 10. Fora de escopo

- Upload de comprovante (decidido: declaração + portaria).
- Aprovação prévia de meia pelo admin (decidido: sem fricção).
- Categoria "Jovem ID Jovem 15-29" (não selecionada).
- Reembolso parcial automático (cobrança da diferença na portaria é manual).
