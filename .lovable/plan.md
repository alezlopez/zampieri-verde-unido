
# Reformulação Visual — Home do Colégio Zampieri

## Escopo
Apenas a rota `/` (página `Index.tsx`) e seus componentes visuais. **Nenhuma alteração** em:
- Webhooks, Supabase, autenticação, RPCs
- Rotas de eventos, login, admin, ingressos, reset password
- `AuthContext`, `EventosLogin.tsx`, edge functions, `.env`

## Identidade Visual (design system)

Atualizar `src/index.css` e `tailwind.config.ts` com tokens HSL semânticos:

```text
--zampieri-green-dark:    #0f3d24
--zampieri-green:         #1a5c38
--zampieri-green-light:   #2d7a4e
--zampieri-wine:          #8b1a1a
--zampieri-gold:          #b8860b
--zampieri-gold-light:    #d4a017
--zampieri-cream:         #f5f0e8
--zampieri-cream-light:   #faf8f4
--zampieri-footer:        #071f12
```

Fontes via Google Fonts (`<link>` em `index.html`):
- **Playfair Display** (400/600/700 + italic) — títulos
- **Lato** (300/400/700) — corpo

Configurar `font-serif` (Playfair) e `font-sans` (Lato) no Tailwind.

## Estrutura de seções (substituir conteúdo atual)

A página `Index.tsx` passará a renderizar, nesta ordem:

1. `TopBar` — novo componente, fundo verde escuro, endereço esquerda / contatos + Portal do Aluno direita. Oculta no mobile.
2. `Header` — refatorado: fundo branco, borda inferior dourada 3px, logo + nome + "Tradição em Educação · Desde 1980", links (A Escola, Ensino, Horários, Depoimentos, Estrutura, Localização) e botão "Matrículas 2027" (link já existente para `espera.colegiozampieri.com.br`).
3. `HeroSection` — refatorado: gradiente verde diagonal, bloco vinho diagonal à direita, faixa dourada, badge "✦ Tradição em Educação · Desde 1980", H1 com "caráter" em itálico dourado, dois CTAs, barra de stats (46+, +10 mil, 2.000m², 3 níveis, Zona Sul SP).
4. `HistorySection` — fundo creme, 3 parágrafos novos, badge vinho "1980 · Fundação", grid 2 colunas de valores.
5. `SistemaArcoSection` — **novo componente**, fundo verde escuro, 2 cards (SAE Digital 📘 dourado / Nave a Vela ⛵ vinho).
6. `CoursesSection` (Níveis de Ensino) — refatorado para 3 cards (Infantil verde, Fundamental vinho, Médio dourado) com tags coloridas.
7. `DiferenciaisSection` — **novo componente**, fundo verde escuro, grid 4 colunas (46+, +10 mil, 2.000m², SAE).
8. `ScheduleSection` — refatorado com novos horários (Infantil só tarde; Fund I/II manhã+tarde + nota 5º/8º/9º; Médio só manhã).
9. `TestimonialsSection` — refatorado: fundo creme, grid 2x2 com **iframes embutidos** (não mais thumbnail com redirect), borda superior dourada, nome da família abaixo.
10. `StructureSection` — refatorado: fundo branco, grid 3x2 de cards creme com 6 itens (16 salas, quadra, lab maker, núcleo ambiental, parque, pátios).
11. `LocationSection` — refatorado: fundo creme, layout 2 colunas (info + mapa), botão "Ver rotas no Google Maps".
12. `MatriculasCTASection` — **novo componente**, fundo verde escuro, "agosto de 2026" destacado em dourado, 3 botões (telefone, WhatsApp, e-mail).
13. `Footer` — refatorado: fundo `#071f12`, faixa tricolor verde/branco/vermelho, 2 colunas de links, copyright 2026.

`EnrollmentBanner` atual: manter desativado/removido da home (substituído pelo botão Matrículas 2027 do header e seção 12) — não toca o componente em si para preservar o link existente.

## Detalhes técnicos

- **Componentes novos**: `TopBar.tsx`, `SistemaArcoSection.tsx`, `DiferenciaisSection.tsx`, `MatriculasCTASection.tsx`.
- **Componentes refatorados** (somente JSX/estilos): `Header`, `HeroSection`, `HistorySection`, `CoursesSection`, `ScheduleSection`, `TestimonialsSection`, `StructureSection`, `LocationSection`, `Footer`, `Index.tsx`.
- Todas as cores via tokens semânticos (`bg-zampieri-green-dark`, `text-zampieri-gold`, etc.) — sem cores hardcoded.
- Responsivo: grids colapsam <900px, hero sem diagonais no mobile, topbar oculta no mobile, menu hamburger preservado.
- SEO: atualizar `<title>` e `<meta description>` em `index.html` ("Colégio Zampieri — Tradição em Educação desde 1980 · Educação Infantil, Fundamental e Médio · São Paulo SP"), manter H1 único no Hero.
- Links externos preservados: matrículas → `https://espera.colegiozampieri.com.br`, WhatsApp → `https://wa.me/5511993796214`, e-mail → `secretaria@colegiozampieri.com.br`, Maps → URL fornecida.
- Thumbnails YouTube serão substituídas por iframes (`youtube.com/embed/...`) — mais simples, sem fallback de imagem.

## Não será alterado
- `App.tsx` (rotas), `AuthContext`, `supabase/`, `EventosLogin.tsx`, `EventoCompra.tsx`, `EventosAdmin.tsx`, `MeusIngressos.tsx`, `IngressoDetalhe.tsx`, `ScannerIngressos.tsx`, `ResetPassword.tsx`, `ChatWindow.tsx`, `ContactForm.tsx`, `FloatingChat.tsx`, `MapadaSuaProximaGrandeAventura.tsx`, edge functions, types, secrets.
