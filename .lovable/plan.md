## Objetivo

Padronizar visualmente todas as rotas secundárias (Eventos + institucionais) para seguir a identidade aplicada na home (`/`), sem mexer em hooks, queries Supabase, RPCs, validações ou fluxos de negócio.

## Padrão visual de referência (home)

- **Tokens**: `bg-background`, `text-foreground`, `bg-card`, `border-border`, paleta `zampieri-green-dark / green / green-light / gold / gold-light / cream / wine / footer`. Nada de classes cruas (`bg-green-600`, `text-white` direto, gradientes `from-green-X`).
- **Tipografia**: títulos em `font-serif` (Playfair Display) com `text-zampieri-green-dark`; corpo em `font-sans` (Lato).
- **Header das sub-páginas (simplificado por contexto)**: barra branca `bg-white/95 backdrop-blur` com `border-b-[3px] border-zampieri-gold`, logo + título "Colégio Zampieri" / subtítulo da página à esquerda, ações contextuais à direita (ex.: Voltar para o site, Meus Ingressos, Sair, Painel Admin). Sem menu de seções da home.
- **Footer**: reutilizar o `Footer` institucional já existente. Quando os links de âncora não fizerem sentido (rotas fora da home), redirecionar para `/#secao` ou esconder a coluna respectiva — manter a coluna de marca + legal.
- **Banners/heroes internos**: fundo `bg-gradient-to-r from-zampieri-green-dark to-zampieri-green` com filete dourado inferior, título serifado.
- **Cards**: usar componente `Card` com `border-border` e `shadow-sm`; destaques com `border-zampieri-gold/40` e `bg-zampieri-cream-light`.
- **Botões**: `Button` shadcn nos variants padrão; CTA principal = `bg-zampieri-green-dark hover:bg-zampieri-green`; CTA destaque = `bg-zampieri-gold hover:bg-zampieri-gold-light text-zampieri-green-dark`. Estados destrutivos via `variant="destructive"`.
- **Badges**: status mapeados para tokens (pago = `bg-zampieri-green text-white`, pendente = `bg-zampieri-gold/20 text-zampieri-green-dark`, cancelado = `variant="destructive"`).

## Componente reutilizável a criar

`src/components/EventosHeader.tsx` — header simplificado parametrizável:
- Props: `subtitle?: string`, `actions?: ReactNode`.
- Renderiza logo + "Colégio Zampieri" + subtítulo, mais slot de ações à direita.
- Substitui o cabeçalho duplicado nas rotas de eventos.

(Sem alterar `Header.tsx`, `TopBar.tsx`, `Footer.tsx` da home.)

## Rotas a atualizar

### Eventos (apenas visual)
1. **`/eventos`** (`Eventos.tsx`) — trocar header inline por `EventosHeader`, ajustar banner para gradiente Zampieri, cards usando tokens, badges de esgotado em tokens.
2. **`/eventos/login`** (`EventosLogin.tsx`) — header simplificado, card central com `bg-card border-border`, botões com tokens, mantendo todo o fluxo de CPF/email/reset.
3. **`/eventos/comprar/:id`** (`EventoCompra.tsx`) — header, breadcrumb visual, cards de participantes/resumo/pagamento com tokens; preservar handlers, validações, integração Asaas, termos.
4. **`/eventos/admin`** (`EventosAdmin.tsx`) — header com ação "Voltar a Eventos", abas/cards, formulário manual recém-adicionado e seção de ingressos seguindo o padrão; sem mexer em RPCs nem RLS.
5. **`/eventos/meus-ingressos`** (`MeusIngressos.tsx`) — header, lista de cards de ingresso em tokens, badges padronizadas.
6. **`/eventos/ingresso/:id`** (`IngressoDetalhe.tsx`) — cabeçalho do ingresso com gradiente Zampieri, QR em card claro com filete dourado.
7. **`/eventos/admin/scanner`** (`ScannerIngressos.tsx`) — header, área da câmera com moldura `border-zampieri-gold`, feedback visual usando `zampieri-green` / `destructive`.

### Institucionais
8. **`/privacidade`** (`Privacidade.tsx`) e **`/termos`** (`TermosDeUso.tsx`) — envolver com `TopBar + Header + Footer` da home, container tipográfico `prose`-like com `font-serif` em h1/h2 e tokens Zampieri.
9. **`/reset-password`** (`ResetPassword.tsx`) — mesmo padrão de `EventosLogin` (header simplificado + card central).
10. **`/MapadaSuaProximaGrandeAventura`** (`MapadaSuaProximaGrandeAventura.tsx`) — usar `TopBar + Header + Footer`, hero com gradiente Zampieri, formulário em card tokenizado. Webhook n8n e validações intactos.
11. **`*` NotFound** (`NotFound.tsx`) — página 404 com identidade (logo, mensagem serifada, CTA "Voltar à home" em verde Zampieri).

## Garantias (não-escopo)

- Não alterar: `AuthContext`, hooks, chamadas `supabase.*`, RPCs, validações, máscaras, webhooks n8n, fluxo Asaas, regras de RLS, vínculos por CPF, lógica de termos/autorização, lógica do scanner, lógica do formulário manual de ingresso.
- Não alterar rotas no `App.tsx`.
- Não tocar `Header.tsx`, `TopBar.tsx`, `Footer.tsx` da home (apenas reutilizar).
- Memória `mem://style/visual-identity` será atualizada para refletir o uso obrigatório de tokens semânticos `zampieri-*` em rotas internas.

## Verificação

Após a implementação, inspecionar visualmente cada rota no preview (login → meus ingressos → ingresso → admin → scanner; institucionais e 404), confirmando consistência com a home e ausência de classes de cor cruas.
