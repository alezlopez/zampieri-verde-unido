# Ajustes no fluxo de pré-matrícula e matrícula

13 correções: formulário público, checklist de documentos, regras do admin e liberação do pagamento após a assinatura.

## Formulário de pré-matrícula

1. **Responsável financeiro**: o dropdown passa a ter só **Mãe** e **Pai** (remove "Outro").
2. **Curso de interesse**: some Berçário, Infantil 1, 2, 3 e 4 da lista.
3. **Infantil 5** passa a se chamar **"Infantil 5 (Pré-Escola)"**.
4. **Escola anterior**: nova opção **"Nunca estudou"** — ao marcar, os campos de nome da escola e tipo de escola ficam ocultos/dispensados.
5. **Tela de conclusão**: mensagem passa a informar que recebemos os dados, que faremos a análise e que o retorno virá **por WhatsApp e e-mail em até 24 horas úteis**.

## Envio de documentos (família)

6. **Pai e mãe separados**: onde hoje existe um único item "RG e CPF dos pais/responsáveis", passam a existir dois itens independentes — "RG e CPF do pai" e "RG e CPF da mãe" — cada um com seu upload e seu status. Quando a pré-matrícula indicar que só há um responsável, apenas o item correspondente é obrigatório.
7. **Histórico e transferência separados**: dois itens distintos — "Histórico escolar" e "Declaração de transferência". No histórico, uma caixa **"Já solicitei na escola anterior, aguardando o prazo de entrega"**, que libera o envio para análise sem o arquivo (o item fica marcado como "aguardando escola" para a secretaria).

Os documentos já enviados no formato antigo continuam válidos e aparecem no novo item de pai/mãe correspondente, sem precisar reenviar.

## Painel do admin

8. **Aprovar documentação exige valores**: o botão de aprovar fica bloqueado (com aviso) enquanto os campos financeiros obrigatórios não estiverem salvos — anuidade, mensalidade com desconto, valor da matrícula e dia de vencimento. A validação é feita também no servidor.
9. **Remover "Gerar contrato"**: o botão sai da tela do admin; o contrato passa a ser gerado somente quando a família conclui o preenchimento dos dados.

## Portal da família

10. **Valores só leitura**: o bloco financeiro aparece como resumo, sem campos editáveis.
11. **Retorno da ZapSign**: o contrato passa a ser criado com link de redirecionamento pós-assinatura apontando para o próprio painel da família (`/matricula?t=<token>&assinatura=ok`), então a pessoa volta direto para a tela e segue para o pagamento.
12. **Assinatura não reconhecida**: hoje o portal só depende do webhook da ZapSign; a matrícula em teste está com contrato gerado e `contrato_assinado` ainda falso. Vamos adicionar uma verificação ativa (mesma abordagem já usada na rematrícula 2027): ao abrir o painel, ao voltar da assinatura e a cada poucos segundos enquanto o contrato estiver pendente, o portal consulta a ZapSign pelo token do documento e atualiza o banco. Também um botão "Já assinei, verificar agora". Assim o pagamento libera mesmo se o webhook falhar.

## Mensagens de WhatsApp

13. Os segredos do WhatsApp existem, mas não há registro recente de envio nos logs — a causa ainda não está confirmada. O trabalho aqui é: registrar a resposta completa da API da Meta (código de erro e motivo) em todos os envios, tratar erro sem quebrar o fluxo, e adicionar uma ação de teste no admin que dispara um template para um número informado e mostra a resposta da Meta. Com esse retorno em mãos, corrigimos o que estiver errado (nome do template, idioma, formato do número ou parâmetros do botão).

## Detalhes técnicos

**Banco (migration):**
- `matricula_documentos`: novo status permitido `aguardando_escola`.
- Migração dos registros existentes do tipo `rg_cpf_pais` para `rg_cpf_pai`, e de `historico_escolar` para os novos tipos.

**Compartilhado:**
- `_shared/matricula-docs.ts`: checklist reescrito com `rg_cpf_pai`, `rg_cpf_mae`, `historico_escolar`, `declaracao_transferencia`.
- `_shared/matricula-contrato.ts`: `redirect_link` no payload da ZapSign com o token do responsável; passa a receber o token da pré-matrícula.
- `_shared/prematricula-mensagens.ts`: log estruturado da resposta da Meta e função exportada para teste.

**Edge functions:**
- `matricula-portal`: nova ação `verificar_assinatura` (consulta a ZapSign pelo `zapsign_token`, marca `contrato_assinado`/`status`); `enviar_analise` aceita o histórico marcado como "aguardando escola".
- `matricula-admin`: `aprovar_documentos` valida `valoresProntos(mat)` antes de aprovar; remove a ação `gerar_contrato`; nova ação `testar_whatsapp`.
- `prematricula-enviar`: aceita `escola_atual = "Nunca estudou"` sem tipo de escola.

**Frontend:**
- `src/components/prematricula/types.ts`: lista `SERIES` ajustada.
- `src/components/prematricula/Etapas.tsx`: dropdown sem "Outro", opção "Nunca estudou".
- `src/pages/PreMatricula.tsx`: texto da tela de conclusão e validação condicional da etapa 2.
- `src/pages/Matricula.tsx`: novos itens de documento, caixa "aguardando escola", polling/botão de verificação de assinatura, valores em modo leitura.
- `src/pages/MatriculaAdmin.tsx`: botão de aprovar condicionado aos valores, remoção do botão de gerar contrato, bloco de teste de WhatsApp.
