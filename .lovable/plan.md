## Objetivo

Criar uma tela exclusiva do evento, onde a descrição completa apareça sem cortes. O fluxo de compra atual continua funcionando exatamente como está — apenas adicionamos uma etapa intermediária entre o card do evento e o checkout.

## Fluxo novo

```
/eventos  →  /eventos/:id  (detalhe — NOVO)  →  /eventos/comprar/:id  (checkout — inalterado)
```

- O card em `/eventos` deixa de apontar direto para `/eventos/comprar/:id` e passa a apontar para `/eventos/:id`.
- A página de detalhe mostra todas as informações do evento (imagem grande, título, data, horário, local, vagas, preço, parcelamento, público-alvo, badges, e a **descrição completa** com quebras de linha preservadas).
- Um botão "Comprar Ingresso" leva para `/eventos/comprar/:id` (mesma página de hoje, sem alterações de lógica).
- Se o usuário não estiver logado, o botão leva para `/eventos/login` (mesmo comportamento atual do card).

## Tela de detalhe (`/eventos/:id`)

Layout:
- `EventosHeader` no topo (mesmo padrão das outras telas).
- Hero com `imagem_url` em destaque (full width, altura ~ 320–420px).
- Bloco principal:
  - Título (`font-serif`, verde escuro).
  - Badges: público-alvo, "Esgotado" (se aplicável), "Aluno cortesia" (se `aluno_cortesia`), "Requer autorização" (se aplicável).
  - Linhas com ícones: data, horário, local, vagas disponíveis.
  - Preço grande + parcelamento + meia-entrada (quando habilitada).
  - **Descrição completa** sem `line-clamp`, com `whitespace-pre-line` para preservar quebras de linha que o admin digitou.
- CTA fixo/destacado: "Comprar Ingresso" (ou "Esgotado" / "Exclusivo para alunos" / "Entrar para comprar", reaproveitando a mesma lógica `podeComprar` de `Eventos.tsx`).
- Link "← Voltar para eventos".
- Estados: loading (spinner), evento não encontrado / inativo (mensagem + voltar).
- SEO: `<title>` e meta description com base no título e descrição do evento.

## Alterações nos arquivos

1. **Novo:** `src/pages/EventoDetalhe.tsx` — tela descrita acima.
2. **`src/App.tsx`** — adicionar rota `<Route path="/eventos/:id" element={<EventoDetalhe />} />` acima da rota catch-all e abaixo das rotas mais específicas (`/eventos/comprar/:id`, `/eventos/login`, `/eventos/admin`, `/eventos/meus-ingressos`, `/eventos/ingresso/:id`, `/eventos/admin/scanner` continuam tendo prioridade por serem definidas com paths fixos antes — React Router v6 não usa ordem para match, então não há risco de conflito).
3. **`src/pages/Eventos.tsx`** — trocar o destino do botão "Comprar Ingresso" do card: `to={user ? \`/eventos/comprar/${evento.id}\` : "/eventos/login"}` passa a ser `to={\`/eventos/${evento.id}\`}` (a tela de detalhe é pública; o gate de login acontece ao clicar em comprar lá dentro). Tudo o mais permanece igual.

## O que NÃO muda

- `EventoCompra.tsx` permanece intacto (lógica de seleção de alunos, cortesia, checkout, n8n/Asaas).
- `EventosAdmin.tsx`, `MeusIngressos.tsx`, edge functions, RLS, banco — nada é tocado.
- Comportamento de "Esgotado" e "Exclusivo para alunos" no card continua igual.

## Detalhes técnicos

- Fetch do evento: `supabase.from("eventos").select("*").eq("id", id).eq("ativo", true).maybeSingle()`.
- Reuso do hook `useAuth` e da consulta a `compradores_externos` para resolver `tipoComprador` (mesmo padrão de `Eventos.tsx`) e decidir o rótulo do CTA.
- Tipagem do evento copiada da interface já existente em `Eventos.tsx` (poderemos extrair depois para `src/types/evento.ts` se quiser; nesta rodada mantenho local para não mexer em outros arquivos).
- Tokens semânticos do design system (`zampieri-green-dark`, `zampieri-gold`, etc.) — sem cores hardcoded.
