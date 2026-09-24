# Pré-matrícula: trava por CPF do responsável

## Situação hoje
A trava de duplicidade olha só para o aluno (nome + data de nascimento). Se já existe qualquer pré-matrícula dele, mesmo reprovada, a família não consegue seguir. Exemplo: Isabela (BBD8D534) e Matheus (21146771) foram reprovados por motivo financeiro com o CPF do pai (Renato) e agora não conseguem tentar com o CPF da mãe.

## Como vai funcionar

- **Pré-matrícula em andamento** (qualquer status que não seja reprovado, cancelado ou desistente): continua bloqueado, igual a hoje. Não pode haver duas ativas para o mesmo aluno.
- **Pré-matrícula anterior reprovada:** a família pode tentar de novo, **desde que use outro responsável (outro CPF)**.
  - Ao identificar o aluno, o sistema avisa: "Já houve uma tentativa com o responsável Renato (pai). Continue com o outro responsável."
  - No campo "O responsável é", a opção usada antes (ex.: Pai) fica **desativada**, e só a outra fica disponível.
  - Se digitarem o mesmo CPF da tentativa anterior, o envio é recusado com a mesma explicação.
- Quando os dois responsáveis já foram tentados e reprovados, o formulário mostra que não é possível nova tentativa e orienta a falar com a secretaria pelo WhatsApp.
- A nova tentativa gera um **novo protocolo**; a reprovada continua no histórico do painel.

## Detalhes técnicos

**Banco (migration)**
- Trocar o índice único `prematriculas_aluno_unico (aluno_chave, aluno_nascimento)` por um índice único parcial valendo apenas para pré-matrículas ativas (`status NOT IN ('reprovado','cancelado','desistente')`), mais um índice único `(aluno_chave, aluno_nascimento, resp_cpf)` para impedir repetir o mesmo CPF.

**Edge functions**
- `prematricula-otp` (`checar_aluno`): passa a retornar `ativa` (bloqueia) ou a lista de tentativas anteriores reprovadas com `resp_tipo`, primeiro nome do responsável e CPF mascarado — sem expor dados completos.
- `prematricula-enviar`: mesma regra no servidor — recusa se houver ativa (`aluno_duplicado`) ou se o `resp_cpf` já tiver sido usado para esse aluno (`responsavel_ja_utilizado`).

**Frontend**
- `PreMatricula.tsx` / `Etapas.tsx`: aviso da tentativa anterior, opção de responsável já usada desativada no seletor (e troca automática se estiver selecionada, levando a família de volta à etapa do responsável), mensagem específica para `responsavel_ja_utilizado` e para "ambos já tentados".

## Fora do escopo
- Regras de reprovação/aprovação e textos dos templates.
