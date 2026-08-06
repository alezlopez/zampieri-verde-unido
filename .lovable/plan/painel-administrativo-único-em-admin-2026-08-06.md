# Painel administrativo único em /admin

## Por que hoje cai no login de eventos

A página de administração da rematrícula (`/rematricula2027/admin`) exige perfil de administrador. Quando não há sessão de admin ativa, ela redireciona para `/eventos/login`, que é o único login administrativo existente hoje. Nesse login existe o modo "Login Administrativo" (e-mail + senha) — é por ele que se entra, mas depois do login ele sempre leva para `/eventos`, e não de volta para a página de rematrícula. Daí a sensação de que não dá para entrar.

## O que será construído

Um único ponto de entrada administrativo, sem duplicar telas já existentes.

1. **`/admin/login`** — tela de login exclusiva para equipe (e-mail + senha, com "esqueci minha senha"). Reaproveita a lógica de login administrativo que já existe.
   - Admin entra e vai para `/admin`.
   - Conferente entra e vai direto para o scanner.
   - Se o acesso veio de uma página protegida, volta para ela após o login.

2. **`/admin`** — painel central com atalhos organizados em blocos:
   - **Eventos**: gerenciar eventos, relatório de vendas
   - **Produtos**: gerenciar produtos, relatório de produtos
   - **Portaria**: scanner de ingressos e retirada de produtos
   - **Rematrícula 2027**: administração de rematrículas e números da sorte
   - Cabeçalho com nome do usuário logado e botão sair.
   - Conferente vê apenas o bloco de Portaria.

3. **Guarda de acesso unificada** — um componente único que protege todas as páginas administrativas. Todas passam a mandar para `/admin/login` (guardando a página de destino) em vez de `/eventos/login` ou `/eventos`.

4. **Rotas antigas continuam funcionando** — `/eventos/admin`, `/eventos/admin/relatorio`, `/eventos/admin/produtos`, `/eventos/admin/produtos/relatorio`, `/eventos/admin/scanner` e `/rematricula2027/admin` permanecem válidas (links e favoritos existentes não quebram). O login administrativo dentro de `/eventos/login` deixa de ser necessário e passa a apontar para `/admin/login`.

## Detalhes técnicos

- Novos arquivos: `src/pages/AdminLogin.tsx`, `src/pages/AdminHome.tsx`, `src/components/admin/RequireAdmin.tsx`.
- `RequireAdmin` usa `useAuth()` (`isAdmin`, `isConferente`, `loading`) e aceita `allow="admin" | "scan"`; enquanto `loading`, mostra spinner; sem permissão, `navigate("/admin/login", { state: { redirectTo: location.pathname } })`.
- Rotas em `src/App.tsx`: `/admin/login`, `/admin`, e as páginas admin existentes envolvidas por `RequireAdmin` (as rotas atuais são mantidas como estão, apenas embrulhadas).
- Nas páginas admin, o `useEffect` de redirecionamento próprio é removido em favor do guard (`Rematricula2027Admin`, `EventosAdmin`, `EventosRelatorio`, `ProdutosAdmin`, `ProdutosRelatorio`, `ScannerIngressos`).
- Nenhuma mudança de banco, RLS, RPC ou edge function. As permissões continuam baseadas em `user_roles` + `has_role`.
