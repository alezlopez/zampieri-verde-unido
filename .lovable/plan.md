# Números da sorte da Rematrícula 2027

Promoção que dá números da sorte ao aluno quando o pagamento da rematrícula é confirmado, com página de consulta e painel administrativo.

## Como funciona

Quantidade de números conforme a data em que o pagamento é confirmado:

```text
24/08/2026 a 08/09/2026 → 6 números
09/09/2026 a 30/09/2026 → 3 números
01/10/2026 a 16/10/2026 → 2 números
17/10/2026 a 28/10/2026 → 1 número
```

Cada número tem 4 dígitos (0000–9999), é único em toda a promoção e fica vinculado ao aluno. A geração acontece uma única vez por aluno: se o aluno já tem números, nada é gerado de novo. Pagamentos confirmados fora das janelas acima não geram números (mantemos o registro e a promoção simplesmente não se aplica).

Observação de capacidade: existem 10.000 combinações possíveis de 4 dígitos. Com 6 números por aluno na primeira faixa, o limite prático é de aproximadamente 1.600 alunos nessa fase. Se a expectativa for maior, vale usar 5 dígitos — me avise.

## Onde os números aparecem

1. **Tela de sucesso da rematrícula** — bloco com os números logo após o pagamento confirmado.
2. **E-mail de conclusão** — os números entram como uma nova variável no template do Resend (você precisa adicionar `{{{numeros_sorte}}}` no template `fb5ae969-...`).
3. **Página pública de consulta** `/numerosdasorte` — busca por CPF ou telefone (mesmas máscaras da tela de busca atual) + data de nascimento do aluno, listando os números do aluno.
4. **Painel administrativo** `/rematricula2027/admin` — restrito a administradores.

## Painel administrativo

- Lista de todos os alunos da rematrícula 2027 com: nome, curso 2027, turno, responsável financeiro, contrato gerado, contrato assinado, rematrícula concluída, forma de pagamento, valor pago e data de pagamento.
- Filtros por status (concluída / contrato assinado / pendente) e busca por nome ou ID do aluno.
- Coluna com os números da sorte de cada aluno.
- Busca reversa: digitar um número da sorte e ver a qual aluno pertence.
- Totais no topo (total de alunos, concluídas, contratos assinados, números emitidos).

## Detalhes técnicos

**Migration**
- Tabela `rematricula_2027_numeros_sorte`: `id`, `id_aluno` (FK para `alunos_rematricula_2027`), `numero` text(4) com índice único global, `faixa` (rótulo da janela), `created_at`. RLS ativa, sem acesso público direto (leitura só via RPCs); GRANTs para `service_role` e leitura para `authenticated` (usada pelo admin com checagem `has_role`).
- Função `gerar_numeros_sorte_2027(p_id_aluno)` SECURITY DEFINER: usa `pg_advisory_xact_lock` para evitar concorrência, resolve a faixa pela data atual, sai sem fazer nada se o aluno já tiver números, e sorteia números com retry até obter valores livres.
- Trigger `AFTER UPDATE` em `alunos_rematricula_2027` quando `rematricula_concluida` passa de falso para verdadeiro chama a função — cobre tanto o webhook do Asaas quanto alterações manuais no banco.
- RPC `rematricula_2027_numeros_consultar(p_termo, p_data_nascimento)`: valida CPF/telefone contra os dados do aluno e retorna nome, curso e números; protegida pelo `rematricula_2027_rate_hit` já existente.
- RPC admin `rematricula_2027_admin_listagem()`: retorna a listagem completa, exigindo `has_role(auth.uid(), 'admin')`.

**Frontend**
- Nova página `src/pages/NumerosDaSorte.tsx` + rota `/numerosdasorte`, reaproveitando as máscaras de CPF/telefone de `StepBusca`.
- Nova página `src/pages/Rematricula2027Admin.tsx` + rota `/rematricula2027/admin`, com guarda de admin igual às demais telas administrativas.
- `StepPagamento.tsx` / `StepSucesso.tsx`: buscar e exibir os números após a confirmação do pagamento.

**Edge function**
- `rematricula-2027-email-conclusao`: incluir a variável `numeros_sorte` (números separados por vírgula) no payload do Resend.

Nenhuma alteração na lógica de contrato, checkout ou rateio financeiro.
