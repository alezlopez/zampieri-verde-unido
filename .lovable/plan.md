# Correções na rematrícula 2027 (CPF e status no admin)

## O que foi verificado nos dados reais

- Tabela `alunos_rematricula_2027`: 747 alunos.
- CPFs do pai: 623 preenchidos, **273 são inválidos** (não passam no dígito verificador). CPFs da mãe (729) e do aluno (460) estão todos válidos.
- Ou seja: o CPF "que não é da pessoa" vem da própria importação da base — o site apenas exibe o que está gravado. No caso da família Lorena Dias Alves, o pai corrigiu de `174.872.238-77` para `280.612.318-67` e o log de alterações registrou a correção.
- Situação real dos contratos: 3 gerados, 2 assinados, 0 pagos — o painel mostra as três etiquetas para todo mundo porque a etiqueta "desligada" só muda de cor (cinza claro), parecendo ativa.

## O que será corrigido

### 1. CPF do pai/mãe travado e inválido (bloqueia a família)

Hoje o CPF vindo da base fica sempre bloqueado ("CPF já cadastrado e não pode ser alterado"), mas a validação no avanço acusa "CPF inválido" — a família não consegue nem corrigir nem seguir. Mudanças na tela do responsável:

- Quando o CPF gravado **for inválido**, o campo abre destravado com o aviso: "Confira o CPF: o número cadastrado parece incorreto, corrija antes de continuar."
- Quando o CPF gravado **for válido**, ele continua bloqueado, mas ganha o link "corrigir" (como os demais campos), para o caso de o número pertencer a outra pessoa. Ao corrigir, o novo valor é validado e a mudança fica registrada no histórico de alterações que o admin já vê.
- Mesma regra aplicada ao CPF do aluno na etapa 1.

### 2. Etiquetas de situação no painel admin

- Exibir apenas as etapas realmente concluídas (Gerado / Assinado / Pago), com cor sólida.
- Quando nenhuma etapa foi concluída, mostrar "Não iniciada" em texto neutro.
- Etapa concluída em verde; nada de etiqueta cinza que parece ativa.

### 3. Varredura de consistência

- Novo filtro/indicador no painel `/rematricula2027/admin`: "CPF do pai inválido", para a secretaria conseguir listar e corrigir os 273 registros pelo próprio painel (a edição de contatos já existe e passa a aceitar CPF, com validação).
- Conferência dos contadores do painel (gerados/assinados/pagos) contra a base, para garantir que os filtros batem com os números reais.

## Detalhes técnicos

- `src/components/rematricula/StepResponsavel.tsx`: `naoCorrigivel` deixa de travar `cpf`; travamento passa a considerar `isValidCpf` do valor inicial; mensagens de ajuda ajustadas.
- `src/components/rematricula/StepAluno.tsx`: mesma regra para `cpf_aluno` já cadastrado inválido.
- `src/pages/Rematricula2027Admin.tsx`: componente `Badge` renderiza somente quando `ok`; fallback "Não iniciada"; filtro extra de CPF inválido usando validação no cliente; diálogo "Editar contatos" ganha campos de CPF do pai/mãe.
- Backend: `rematricula_2027_salvar` já valida CPF via `public.valida_cpf` e grava o diff em `rematricula_2027_alteracoes` — sem mudança. Se a edição de CPF pelo admin exigir, ampliar `rematricula_2027_admin_editar_contatos` para aceitar `cpf_pai`/`cpf_mae` com a mesma validação.
- Nenhuma alteração em contrato (ZapSign), checkout Asaas ou regras de vagas.
