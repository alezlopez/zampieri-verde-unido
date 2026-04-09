

## Plano: Adicionar botão de Logout na página /eventos

### Alteração única em `src/pages/Eventos.tsx`

Adicionar um botão "Sair" (com ícone `LogOut`) ao lado do botão "Meus Ingressos" no header, quando o usuário está logado. Ao clicar, chama `signOut()` do `AuthContext`.

- Importar `LogOut` do lucide-react
- Extrair `signOut` do `useAuth()`
- Adicionar botão "Sair" após o link "Meus Ingressos"

