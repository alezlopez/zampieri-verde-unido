# Contrato: dados do responsável já preenchidos pela pré-matrícula

## Objetivo
Quando a família abre a etapa "Dados para o contrato", os campos Nome, CPF, WhatsApp e E-mail já devem vir preenchidos com o que foi informado na pré-matrícula, no bloco correto (Pai ou Mãe) conforme a escolha feita lá, e também no bloco do Responsável financeiro.

## Situação atual (verificada)
- A pré-matrícula grava `resp_tipo` como `pai` ou `mae`.
- A matrícula é criada copiando nome/CPF/WhatsApp/e-mail do responsável tanto para `resp_fin_*` quanto para o bloco pai ou mãe correspondente — mas **apenas no momento em que o registro é criado**. Matrículas criadas antes dessa lógica, ou casos em que algum campo ficou vazio, continuam sem os dados.
- No formulário, ao escolher "quem é o responsável financeiro", os campos do responsável são copiados do bloco pai/mãe — inclusive quando esse bloco está vazio, o que pode **apagar** dados já preenchidos.

## O que será feito

1. **Preenchimento garantido (backend)**
   - Ao carregar o portal da matrícula, se `nome/cpf/celular/email` do lado correspondente (pai ou mãe) ou os campos do responsável financeiro estiverem vazios, preencher com os dados da pré-matrícula antes de devolver o estado. Só preenche o que está vazio — nunca sobrescreve o que a família já editou.
   - Mesma regra aplicada na criação do registro (mantida).

2. **Formulário não apaga dados (frontend)**
   - Ajustar a cópia automática pai/mãe → responsável financeiro para só sobrescrever quando houver valor de origem; campos vazios preservam o que já existe.
   - Bloco do responsável já abre com o pai/mãe selecionado conforme a pré-matrícula.

3. **Sinalização visual**
   - Pequena nota no topo do bloco: "Dados trazidos da sua pré-matrícula — confira e ajuste se precisar."

## Detalhes técnicos
- `supabase/functions/matricula-portal/index.ts`: helper de "seed" idempotente aplicado na ação `estado` (persiste no banco os campos vazios), usando `pm.resp_tipo`, `pm.resp_nome`, `pm.resp_cpf`, `pm.resp_whatsapp`, `pm.resp_email`.
- `src/components/matricula/FormDadosContrato.tsx`: `useEffect` de espelhamento passa a usar merge condicional (`valor || anterior`); nota informativa no bloco do responsável.
- Sem alterações de schema, contrato ZapSign, pagamento ou permissões.
