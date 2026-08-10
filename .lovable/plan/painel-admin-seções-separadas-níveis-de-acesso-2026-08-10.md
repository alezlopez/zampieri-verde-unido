# Painel Admin: seções separadas + níveis de acesso

## Objetivo
1. Reorganizar o painel `/admin` para que Matrículas (novos alunos) e Rematrícula 2027 fiquem em seções distintas.
2. Criar níveis de acesso por setor (rematrícula, matrícula, eventos, portaria, produtos), atribuídos manualmente no banco, sem tela de cadastro.

## Como fica o painel

Seções na home do admin, cada uma visível apenas para quem tem o setor correspondente (admin vê tudo):

```text
Eventos        -> Gerenciar eventos | Relatório de vendas
Produtos       -> Gerenciar produtos | Relatório de produtos
Portaria       -> Scanner / Retirada
Matrículas     -> Pré-matrículas | Agenda da entrevista | Matrículas (documentos/contrato)
Rematrícula 27 -> Administração | Follow-up | Números da sorte
```

Cada seção ganha cor/ícone próprio e a home mostra apenas o que o usuário pode acessar. Se o usuário tiver um único setor, ele é levado direto para a tela principal daquele setor após o login.

## Níveis de acesso

Novos papéis adicionados ao tipo de papéis já existente (`app_role`), guardados na tabela `user_roles` (um usuário pode ter vários):

- `admin` — acesso total (continua como está)
- `rematricula`, `matricula`, `eventos`, `portaria`, `produtos`
- `conferente` continua funcionando e passa a equivaler a `portaria`

Para criar um operador: você cria o usuário no painel de autenticação do Supabase e insere as linhas em `user_roles` com os setores dele. Vou deixar no plano um SQL pronto de exemplo para copiar/colar.

## Detalhes técnicos

**Migration**
- `ALTER TYPE app_role ADD VALUE` para os 5 novos papéis.
- Função `public.has_setor(_user_id uuid, _setor text)`: SECURITY DEFINER, STABLE, retorna true se o usuário for `admin`, tiver o papel do setor, ou (para `portaria`) tiver `conferente`.
- Atualizar as políticas RLS e RPCs que hoje exigem `has_role(auth.uid(),'admin')` para usar `has_setor` com o setor correto:
  - `eventos`, `produtos`, `produto_variacoes`, `evento_produtos`, `ingressos`, `pedidos_produtos` (admin de eventos/produtos)
  - RPCs `rematricula_2027_admin_*` -> setor `rematricula`
  - tabelas/políticas de `prematriculas`, `matriculas`, `matricula_documentos`, `prematricula_agenda_*` -> setor `matricula`
  - `buscar_ingresso_scan`, `marcar_ingresso_utilizado`, `marcar_produto_retirado` -> setor `portaria`

**Edge functions** (troca da checagem `has_role(...,'admin')` por `has_setor(...,'<setor>')`, admin continua passando):
- `relatorio-vendas`, `cancelar-ingresso`, `atualizar-taxa-manual`, `asaas-sync-payment` -> `eventos`
- `relatorio-produtos`, `backfill-produtos-financeiro`, `backfill-financeiro` -> `produtos`
- `matricula-admin`, `prematricula-admin-acao` -> `matricula`

**Frontend**
- `AuthContext`: buscar todos os papéis do usuário de uma vez e expor `setores: string[]` + helper `podeAcessar(setor)`, mantendo `isAdmin`/`canScan` para não quebrar o que já existe.
- `RequireAdmin`: passa a aceitar `setor="eventos" | "produtos" | "portaria" | "matricula" | "rematricula"` (default `admin`), mantendo o atalho flutuante para `/admin`.
- `App.tsx`: cada rota admin recebe o setor correspondente.
- `AdminHome.tsx`: blocos reescritos com as 5 seções acima e filtro por setor.

## Fora do escopo
Nenhuma alteração nas telas públicas, no fluxo de compra, checkout, contratos ou nos templates de mensagem.
