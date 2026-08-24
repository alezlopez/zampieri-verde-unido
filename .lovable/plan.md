# Edição de desconto e mensalidade em campo separado (Rematrícula 2027)

Em vez de misturar valores financeiros no diálogo "Editar contatos dos responsáveis", o painel ganha uma ação própria — "Editar valores" — com seu próprio diálogo. Isso deixa a UI do admin mais clara e separa contatos de dinheiro.

## O que o admin vê

Na ficha de cada aluno, ao lado de "Editar contatos", um botão **Editar valores** abre um diálogo com:

- **Percentual de desconto** — lista de 0% a 60%, de 5 em 5.
- **Percentual por extenso** — texto para o contrato (ex.: "trinta por cento"), preenchido automaticamente ao escolher o percentual, editável.
- **Mensalidade com desconto (R$)** — valor numérico; sugerido automaticamente a partir do valor cheio e do percentual, mas o admin pode sobrescrever.
- **Mensalidade por extenso** — texto para o contrato, editável.
- Resumo em cima: valor cheio atual, desconto atual e mensalidade atual.

Regras de bloqueio, mostradas em texto no próprio diálogo:

- Contrato **assinado** ou rematrícula **paga/concluída** → campos somente leitura, com aviso de que é preciso cancelar/refazer pela secretaria.
- Contrato apenas **gerado** (não assinado) → salvar é permitido, mas avisa que o contrato será invalidado e precisará ser gerado de novo com os valores corretos; ao salvar, o sistema limpa o contrato gerado para forçar nova geração.
- Caso contrário → edição livre.

Toda alteração entra no histórico de alterações já existente da ficha (com rótulos "Percentual de desconto", "Mensalidade com desconto", etc.).

## Detalhes técnicos

**Banco (migration)**

- Nova função `public.rematricula_2027_admin_editar_valores(p_id_aluno bigint, p_percentual_desconto numeric, p_percentual_desconto_ext text, p_valor_com_desconto numeric, p_valor_com_desconto_ext text)`, `SECURITY DEFINER`, `search_path = public`.
- Autorização: exige `has_role(auth.uid(),'admin')` ou `has_setor(auth.uid(),'rematricula')`; `REVOKE EXECUTE FROM anon`, `GRANT EXECUTE TO authenticated`.
- Validações: percentual entre 0 e 60 e múltiplo de 5; `valor_com_desconto > 0`; recusa se `contrato_assinado` ou `rematricula_concluida` ou `data_pagamento` preenchido (retorna `success=false` com mensagem).
- Grava as mudanças em `rematricula_2027_alteracoes` (um registro por campo alterado, com valor anterior e novo).
- Se `contrato_gerado = true` e não assinado: zera `contrato_gerado`, `link_contrato`, `zapsign_token` para forçar nova geração.
- Retorna `success boolean, message text`.

**Frontend — `src/pages/Rematricula2027Admin.tsx`**

- Novo estado `editandoValores` + `formValores` (percentual, percentual_ext, valor, valor_ext), separado do `form` de contatos.
- Novo botão na ficha e novo `<Dialog>` independente; nada muda no diálogo de contatos.
- Helper local para número por extenso em português (reais/centavos e percentual) para pré-preencher os campos `_ext`, com edição manual permitida.
- Sugestão automática da mensalidade: `valor_cheio * (1 - percentual/100)`, arredondada em 2 casas, recalculada ao trocar o percentual enquanto o admin não editar o valor à mão.
- Após salvar com sucesso: toast, fecha o diálogo e recarrega a listagem.
- Acrescentar `percentual_desconto`, `percentual_desconto_ext`, `valor_com_desconto`, `valor_com_desconto_ext` ao mapa `LABEL_CAMPO` para o histórico ficar legível.

Nenhuma alteração no fluxo público de rematrícula, no checkout ou na geração de contrato além do reset descrito.
