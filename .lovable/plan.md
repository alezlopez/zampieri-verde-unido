# Resumo diário de vendas por e-mail (20h)

## Objetivo
Todo dia às 20h (horário de Brasília), enviar para `alexandre.zampieri@colegiozampieri.com.br` um resumo das vendas de **ingressos** (eventos ativos) e **produtos** (ativos).

## Conteúdo do e-mail
Para cada **evento ativo** e cada **produto ativo**:
- Quantidade total vendida (histórico, status `pago`)
- Quantidade vendida **no dia** (status `pago`, `data_pagamento` dentro do dia)
- **Valor bruto** total e do dia
- **Valor líquido** total e do dia

Mais um bloco de totais gerais (ingressos + produtos) no topo.

## Implementação

### 1. Edge Function `resumo-diario-vendas`
- Roda com `service_role` (sem JWT).
- Consulta:
  - `eventos` onde `ativo = true` → agrega `ingressos` por `evento_id` (status `pago`, excluindo cortesias) — totais históricos e do dia.
  - `produtos` onde `ativo = true` → agrega `pedidos_produtos` por `produto_id` (status `pago`) — totais históricos e do dia.
- Monta HTML responsivo simples (tabelas por seção, tons verdes da identidade Zampieri).
- Envia via **Resend** usando o padrão do gateway de connectors já documentado (`RESEND_API_KEY` + `LOVABLE_API_KEY`).
- Destinatário fixo: `alexandre.zampieri@colegiozampieri.com.br`.
- Remetente: domínio já verificado no Resend (a confirmar com você — ver pergunta abaixo).

### 2. Agendamento (pg_cron + pg_net)
- Cron diário às **20h BRT = 23h UTC**: `0 23 * * *`.
- Faz `net.http_post` para a edge function com header `apikey` (anon).
- Inserido via SQL direto (não migration) por conter URL/anon key específicos do projeto.

### 3. "Dia" = janela considerada
- Intervalo `[hoje 00:00 BRT, hoje 23:59:59 BRT]` calculado em UTC dentro da função.

## Detalhes técnicos
- Bruto/líquido: usa `valor_bruto` e `valor_liquido` já calculados nas tabelas `ingressos` e `pedidos_produtos`. Quando `valor_liquido` estiver nulo (pendente de cálculo), soma como bruto e marca "líquido pendente".
- Sem alterações no app/UI — somente backend.

## Perguntas
1. Confirmar o e-mail de **remetente** (ex.: `nao-responda@colegiozampieri.com.br`)? Precisa estar verificado no Resend.
2. Incluir **cortesias** na contagem do dia (qtd) e separar dos pagos? Padrão proposto: contar cortesias apenas em "qtd cortesias", sem somar em bruto/líquido.
