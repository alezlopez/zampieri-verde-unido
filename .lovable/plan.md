## Objetivo

Eliminar a confusão atual em que o nome do comprador é coletado mas o comprador **não é tratado como participante** automaticamente — ele só vira ingresso se clicar em "Adicionar convidado", o que gera dúvidas no suporte.

A mudança é **só de UX/frontend** em `src/pages/EventoCompra.tsx`. Não toca em hooks, edge functions, RPCs, lógica de meia-entrada, modelo de dados nem políticas RLS. O insert na tabela `ingressos` continua igual — apenas a forma como os participantes são montados na tela muda.

---

## Cenários cobertos

| # | Quem está logado | Tem aluno vinculado ao CPF? | Comportamento atual (ruim) | Comportamento proposto |
|---|---|---|---|---|
| A | Aluno/responsável | Sim, 1+ alunos | Marca aluno(s); para incluir a si mesmo precisa clicar em "Adicionar convidado" e digitar tudo de novo | Mesmo de hoje + card "Você também vai?" pré-preenchido com 1 clique |
| B | Aluno/responsável | **Não** (CPF não bate) | "Nenhum aluno encontrado" + precisa adicionar a si como convidado | Card "Você (comprador)" pré-marcado com nome/CPF do `user_metadata` |
| C | Comprador externo | N/A (sem alunos) | "Nenhum aluno encontrado" + precisa criar convidado | Card "Você (comprador)" pré-marcado e pré-preenchido a partir de `compradores_externos` |
| D | Qualquer | Sim ou Não | Quer comprar só para terceiros (sobrinho, neto…) | Desmarca o card "Você" e usa apenas alunos/convidados |

---

## Mudanças na tela

### 1. Reordenar e renomear seções

```text
┌─ 1. Identificação do comprador ──────────────┐
│  Nome do comprador * (já preenchido)         │
└──────────────────────────────────────────────┘
┌─ 2. Quem vai participar do evento? ──────────┐
│  [✓] Você também vai (Maria Silva)            │ ← novo card
│       CPF: 123.***.***-45                     │
│  ─────────────────────────────────            │
│  Alunos vinculados ao seu CPF:                │ ← só renderiza se houver
│  [✓] João Silva — 6º ano                      │
│  [ ] Pedro Silva — 3º ano                     │
│  ─────────────────────────────────            │
│  + Adicionar outro convidado                   │ ← renomeado de "Convidados extras"
│     (avô, primo, amigo etc.)                  │
└──────────────────────────────────────────────┘
```

### 2. Card "Você (comprador)" — regras

- Sempre visível **se o evento permite convidados** (`publico_alvo !== "apenas_alunos"`).
- Pré-preenchido com:
  - **Comprador externo**: nome, cpf, email, celular, data_nascimento de `compradores_externos`.
  - **Aluno/responsável**: nome e cpf do `user.user_metadata`.
- **Pré-marcado quando**:
  - Não há alunos vinculados (cenários B e C) → quase sempre o comprador é o participante.
  - Comprador externo (sempre pré-marcado).
- **Pré-desmarcado quando**:
  - Existem alunos vinculados (cenário A) → padrão: pai/responsável comprando para o filho.
- O usuário pode marcar/desmarcar livremente.
- Quando marcado, o comprador entra na lista `participantKeys` com chave `comprador-self` e participa do cálculo de meia-entrada normalmente (mesma UI).
- Se evento for "apenas alunos" (`publico_alvo === "apenas_alunos"`), o card não aparece (regra de negócio existente preservada).

### 3. Mensagens vazias mais claras

- Em vez de "Nenhum aluno encontrado para este CPF" (assustador), mostrar:
  - **Comprador externo**: omitir totalmente a seção de alunos.
  - **Aluno/responsável sem match**: "Não localizamos alunos vinculados ao seu CPF. Você pode comprar para si mesmo (marque acima) ou adicionar convidados abaixo." — sem soar como erro.

### 4. Renomeações

- "Convidados extras" → "Outros convidados" (avô, primo, amigo etc.).
- Botão "Adicionar" → "Adicionar convidado".
- Label "Nome do responsável (comprador)" → "Nome do comprador" (palavra "responsável" confunde quando o comprador é ele próprio o participante).

---

## Detalhes técnicos

### Estado novo

```ts
const [comprarParaSi, setComprarParaSi] = useState(false);
const [compradorExternoData, setCompradorExternoData] = useState<{
  cpf?: string; email?: string; celular?: string; data_nascimento?: string;
} | null>(null);
```

- `comprarParaSi` é definido por um `useEffect` que dispara quando `tipoComprador`, `alunos` e `loadingAlunos` estabilizam:
  - `externo` → `true`
  - `aluno` com `alunos.length === 0` → `true`
  - `aluno` com `alunos.length > 0` → `false`
- Persistir a escolha do usuário: se ele alterar manualmente, não sobrescrever depois.

### participantKeys

Adicionar `"comprador-self"` no início quando `comprarParaSi === true`. O resto do código (`getMeia`, `qtdMeias`, `total`, validações) já trabalha com chaves dinâmicas — só precisa do label correto no `participantKeys.map(...)`.

### Insert em `handleComprar`

Adicionar um terceiro loop **antes** dos alunos/convidados:

```ts
if (comprarParaSi) {
  const m = getMeia("comprador-self");
  const isMeia = m.tipo_ingresso === "meia";
  records.push({
    evento_id: evento.id,
    user_id: user.id,
    nome_comprador: nomeComprador.trim(),
    codigo_aluno: null,
    quantidade: 1,
    status: "pendente",
    tipo_participante: "convidado",        // schema preservado
    nome_participante: nomeComprador.trim(),
    cpf_participante: compradorExternoData?.cpf || user.user_metadata?.cpf || null,
    data_nascimento_participante: compradorExternoData?.data_nascimento || null,
    email_participante: compradorExternoData?.email || user.email || null,
    celular_participante: compradorExternoData?.celular || null,
    tipo_ingresso: isMeia ? "meia" : "inteira",
    categoria_meia: isMeia ? m.categoria_meia : null,
    declaracao_meia_aceita: isMeia ? m.declaracao : false,
    declaracao_meia_aceita_em: isMeia && m.declaracao ? nowIso : null,
  });
}
```

Nenhuma mudança no schema, RPCs, edge function `asaas-create-checkout`, webhook, scanner, e-mail de confirmação ou regras de meia-entrada.

### Validação

`totalParticipantes` passa a contar `comprarParaSi ? 1 : 0` + alunos + convidados. O bloqueio "Selecione ao menos um participante" continua válido.

### Carregar dados do comprador externo

Estender o `useEffect` que detecta `tipoComprador` para já trazer `cpf, email, celular, data_nascimento` de `compradores_externos` e guardar em `compradorExternoData`.

---

## O que NÃO vai mudar

- Edge functions (`asaas-create-checkout`, `asaas-webhook`, `enviar-confirmacao-ingresso`, `cancelar-pendentes`).
- RPCs (`find_alunos_by_cpf`, `find_alunos_by_email`, `contar_meias_evento`, `get_comprador_dados`).
- Tabela `ingressos`, `compradores_externos`, `eventos` — sem migration.
- Lógica de meia-entrada (cota, declaração, validação na portaria).
- Lógica de cancelamento automático em 2h.
- Termos, autorização, dialogs.
- Tela do scanner, do admin, de "Meus Ingressos".

---

## Arquivos editados

- `src/pages/EventoCompra.tsx` (único arquivo).

---

## Critério de pronto

1. Comprador externo entra em /eventos/comprar/[id] → vê seu nome já como participante marcado, basta escolher pagamento e finalizar.
2. Responsável com 2 filhos cadastrados → vê os 2 filhos + opção "Você também vai?" desmarcada.
3. Responsável cujo CPF não bate com nenhum aluno → vê "Você (comprador)" pré-marcado + botão para adicionar convidados, sem mensagem de erro.
4. Compra para o próprio comprador gera ingresso com `tipo_participante='convidado'`, `nome_participante` = nome do comprador e demais dados pré-preenchidos.
5. Meia-entrada continua funcionando para o card do comprador (mesma UI).
