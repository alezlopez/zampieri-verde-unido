# Cancelar rematrícula 2027 (com estorno e cancelamento do contrato)

Adiciona no painel de rematrículas uma ação única "Cancelar rematrícula" que, em um só passo: estorna o valor pago no Asaas (se houver), cancela o contrato no ZapSign (se houver) e devolve o aluno ao início do fluxo, podendo refazer a rematrícula em /rematricula2027.

## Como funciona para o admin

1. No card do aluno em `/admin` (rematrículas), aparece o botão "Cancelar rematrícula" (vermelho, discreto, no rodapé do card).
2. Ao clicar, abre um diálogo de confirmação que mostra:
   - o que será feito (estorno do valor pago, cancelamento do contrato, liberação para refazer);
   - o valor que será estornado, quando houver pagamento confirmado;
   - campo obrigatório de motivo (mínimo 3 caracteres);
   - digitar CANCELAR para confirmar.
3. Ao confirmar, o sistema executa tudo e mostra o resultado (estornado / contrato cancelado / apenas cancelado, quando não havia pagamento).
4. O aluno volta para "Não iniciada" na listagem, com uma marca de "Cancelada em <data> por <admin>" e o motivo visível no card.
5. A família pode entrar de novo em /rematricula2027 e refazer o processo normalmente.

Só usuários com permissão de administrador ou do setor de rematrícula veem e usam a ação.

## Detalhes técnicos

**Migration** em `alunos_rematricula_2027` (apenas novas colunas):
`cancelada` (boolean, default false), `cancelada_em`, `cancelada_por` (uuid), `motivo_cancelamento` (text), `estorno_valor` (numeric), `estorno_em`.
`rematricula_2027_admin_listagem` passa a devolver esses campos.

**Nova edge function `rematricula-2027-admin-cancelar`** (mesmo padrão de `cancelar-ingresso`):
- Valida JWT do usuário e exige `has_setor(user, 'rematricula')` ou admin; senão 403.
- Body validado: `id_aluno` (number), `motivo` (string ≥ 3).
- Se houver `asaas_payment_id`: resolve parcelas com `listInstallmentPayments`/`getPayment`, faz `refundPayment` nas pagas e `deletePayment` nas pendentes (reaproveita `_shared/asaas.ts`). Falha de estorno não impede o cancelamento — é reportada na resposta.
- Se houver `zapsign_token`: chama a API do ZapSign para excluir/cancelar o documento (`DELETE /api/v1/docs/{token}/`), usando o segredo já existente. Erro é apenas reportado.
- Reset do aluno para permitir refazer: `contrato_gerado=false`, `contrato_assinado=false`, `link_contrato=null`, `zapsign_token=null`, `rematricula_concluida=false`, `conferida=false`, `asaas_checkout_id/payment_id/checkout_url/checkout_criado_em/forma_pagamento/parcelas/valor_pago/data_pagamento` limpos; grava `cancelada`, `motivo_cancelamento`, `cancelada_em/por`, `estorno_valor/estorno_em`.
- `asaas_customer_id` é preservado (evita duplicar cliente no Asaas).
- Registra a ação em `rematricula_2027_alteracoes` e dispara notificação admin (`notificar_admin`, setor rematrícula).

**Front** — `src/pages/Rematricula2027Admin.tsx`: novo diálogo `CancelarRematriculaDialog` (confirmação, motivo, digitar CANCELAR), botão no card, badge "Cancelada" com motivo, e recarga da listagem após sucesso.

Nada dos fluxos de eventos, produtos, matrícula ou renegociação é alterado. Números da sorte já emitidos não são removidos.
