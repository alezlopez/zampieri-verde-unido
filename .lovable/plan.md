# Notificações no painel administrativo

## Objetivo
Um sino de notificações no painel admin que avisa cada usuário apenas sobre os eventos do(s) setor(es) que ele pode acessar. Admin vê tudo.

## Como funciona para o usuário
- Sino no topo das telas administrativas com contador de não lidas.
- Ao clicar, lista das últimas notificações (título, descrição curta, tempo relativo). Clicar leva direto para a tela relacionada e marca como lida.
- Botão "marcar todas como lidas".
- Chegada em tempo real (sem precisar recarregar a página).

## Eventos notificados, por setor

```text
matricula    -> nova pré-matrícula enviada
                entrevista agendada
                documento enviado pela família
                dados do contrato preenchidos
                contrato de matrícula assinado
                matrícula concluída (pagamento confirmado)
rematricula  -> rematrícula 2027 concluída
                contrato de rematrícula assinado
                pagamento de renegociação de débitos confirmado
eventos      -> ingresso pago
produtos     -> pedido de produto pago
portaria     -> (sem alertas próprios; portaria continua no scanner)
```

## Detalhes técnicos

**Banco**
- Tabela `admin_notificacoes`: `setor` (text), `tipo`, `titulo`, `descricao`, `link`, `ref_id` (text), `created_at`. GRANT para `authenticated` (select) e `service_role` (all); RLS de leitura: `public.has_setor(auth.uid(), setor)`.
- Tabela `admin_notificacoes_lidas`: `notificacao_id`, `user_id`, `lida_em`. GRANT select/insert para `authenticated`; RLS por `auth.uid()`.
- Função `public.notificar_admin(_setor, _tipo, _titulo, _descricao, _link, _ref_id)` (SECURITY DEFINER) usada por triggers e edge functions.
- Triggers nas tabelas existentes: `prematriculas` (insert e mudança de status), `prematricula_agendamentos` (insert), `matricula_documentos` (insert), `matriculas` (dados preenchidos, contrato assinado, concluída), `alunos_rematricula_2027` (contrato assinado, rematrícula concluída), `ingressos` e `pedidos_produtos` (status vira pago), `devedores_2027` (débito quitado). Todos gravam apenas mudanças de estado, sem duplicar.
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notificacoes` para o tempo real.

**Frontend**
- `src/hooks/useNotificacoes.ts`: carrega as últimas 50 notificações visíveis, calcula não lidas, assina o canal Realtime dentro de `useEffect` com `removeChannel` na limpeza, e expõe `marcarLida` / `marcarTodasLidas`.
- `src/components/admin/NotificacoesBell.tsx`: sino + badge + `Popover` com a lista (componentes shadcn já existentes, cores do tema verde).
- O sino é renderizado pelo `RequireAdmin` (canto superior/flutuante junto ao atalho "Painel Admin") e no cabeçalho de `AdminHome.tsx`, então aparece em todas as telas admin sem mexer em cada página.

## Fora do escopo
Nenhum envio de e-mail/WhatsApp novo, nenhuma mudança nos fluxos públicos, checkout, contratos ou webhooks existentes.
