# Matrícula: etapa da família, valores só no admin e responsável financeiro por dropdown

Quatro ajustes no fluxo pós-entrevista, mais um campo novo na pré-matrícula.

## 1. Corrigir o status que a família vê

Hoje o portal mostra "Em análise" em cada documento mesmo depois do admin gerar o contrato. Confirmei no banco: a matrícula do Vicente está com `status = contrato_gerado`, mas os 7 documentos continuam com status `enviado`, porque o contrato foi gerado sem passar pelo botão "Aprovar documentos".

Correções:
- Ao aprovar a documentação (ou ao gerar o contrato), todos os documentos enviados passam automaticamente para `aprovado`.
- O portal deixa de exibir a etiqueta por documento quando a matrícula já passou da fase de documentos: mostra o bloco 1 recolhido com "Documentação aprovada" e leva a atenção para a etapa atual.
- A régua de etapas passa a ser: Documentos → Dados do contrato → Assinatura → Pagamento, com indicação clara de onde a família está.

## 2. Admin preenche só o financeiro

Na tela do admin, o formulário longo some. Fica apenas:

- Anuidade total e por extenso
- Percentual de desconto (já vem preenchido com o desconto aprovado na entrevista) e por extenso
- Mensalidade com desconto e por extenso
- Valor da 1ª parcela e por extenso
- Dia de vencimento
- Valor da matrícula, formas permitidas (à vista / parcelado) e máximo de parcelas

Ações do admin: aprovar/rejeitar documentos, salvar valores e acompanhar assinatura e pagamento. A geração do contrato deixa de ser um botão obrigatório do admin (fica disponível como reenvio/reprocessamento manual).

## 3. Nova etapa da família: dados do contrato

Depois que os documentos são aprovados, o portal libera um formulário para a família:

- **Responsável financeiro**: dropdown Pai / Mãe. Ao escolher, os campos do responsável são replicados a partir dos dados do pai ou da mãe já preenchidos.
- Dados do pai e da mãe: nome, CPF, RG, estado civil, naturalidade, nacionalidade, profissão, data de nascimento, celular, e-mail.
- Endereço: CEP (com busca automática), logradouro, número, complemento, bairro, cidade, estado.
- Dados do aluno (nome, nascimento, série, turno) e o desconto aprovado aparecem preenchidos e bloqueados.
- Os valores financeiros aparecem em um resumo somente leitura.

Ao enviar, o contrato é gerado na hora e o link de assinatura aparece na mesma tela (e é enviado por e-mail). Se o admin ainda não tiver salvo os valores, a etapa fica visível com aviso "aguardando a secretaria liberar os valores".

## 4. Pré-matrícula: quem é o responsável

Na etapa 1 do questionário, um dropdown "O responsável é: Pai / Mãe / Outro" antes do nome. Esse dado é gravado e usado depois para pré-preencher automaticamente o bloco de pai ou mãe na etapa de dados do contrato.

## Detalhes técnicos

**Banco (migration):**
- `prematriculas`: coluna `resp_tipo` (`pai` | `mae` | `outro`).
- `matriculas`: campos de RG/estado civil/naturalidade/nacionalidade/profissão/nascimento para pai e mãe (hoje só existem nome, CPF, celular e e-mail), e novo status `dados_pendentes` / `dados_preenchidos` na régua.

**Edge functions:**
- `matricula-portal`: novas ações `salvar_dados` (valida e grava o formulário da família, com whitelist de campos e validação de CPF/CEP) e `gerar_contrato` (reaproveita a chamada ZapSign hoje em `matricula-admin`, movida para `_shared/matricula-contrato.ts`), bloqueando enquanto os valores financeiros não estiverem preenchidos. `estado` passa a devolver os dados já preenchidos e os valores em modo leitura.
- `matricula-admin`: `aprovar_documentos` marca todos os documentos como `aprovado`; `salvar` restringe a whitelist aos campos financeiros; `gerar_contrato` continua existindo como ação manual usando o shared.
- `prematricula-enviar`: aceita e grava `resp_tipo`.

**Frontend:**
- `src/pages/Matricula.tsx`: régua de etapas, bloco de documentos recolhido após aprovação, novo componente `src/components/matricula/FormDadosContrato.tsx` com o dropdown de responsável financeiro e a replicação de dados.
- `src/pages/MatriculaAdmin.tsx`: remove `CAMPOS_TEXTO`, mantém apenas os campos financeiros e a leitura dos dados enviados pela família.
- `src/components/prematricula/Etapas.tsx` e `types.ts`: campo `resp_tipo` na etapa 1, com validação obrigatória.
