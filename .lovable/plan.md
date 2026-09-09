# Corrigir valor promocional da rematrícula

## O que está acontecendo

O valor com 50% de desconto está cadastrado como válido "até 08/09" (ontem). Como hoje é 09/09, o sistema voltou a mostrar o valor cheio para todas as famílias — foi isso que os três responsáveis viram.

Além disso, a comparação de datas usa o horário de Londres, então mesmo dentro do prazo o desconto some às 21h de Brasília do último dia, três horas antes do previsto.

## O que será feito

1. Estender a validade do desconto até hoje, 09/09, em todas as séries — o valor promocional volta a aparecer imediatamente nas telas de curso e de pagamento.
2. Passar a comparar a data de validade pelo horário de Brasília, para que a promoção valha até as 23h59 do último dia.

## Detalhes técnicos

**Dados (run_sql)**
- `UPDATE public.rematricula_valores_2027 SET promocao_ate = '2026-09-09' WHERE ativo = true;` (13 linhas, todas hoje com `promocao_ate = 2026-09-08`).

**Banco (migration)**
- Substituir `v.promocao_ate >= CURRENT_DATE` por `v.promocao_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date` nas funções que resolvem o valor da rematrícula: `rematricula_2027_status`, `rematricula_2027_buscar` e demais RPCs que replicam esse CASE (verificar com `pg_get_functiondef` antes de recriar cada uma, mantendo assinatura, `SECURITY DEFINER`, `search_path` e grants atuais).

**Frontend — `src/components/rematricula/StepCurso.tsx`**
- O cálculo local de `promoAtiva` usa `new Date().toISOString().slice(0,10)` (UTC). Trocar pela data em Brasília (`toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })`) para o riscado e o aviso "válido até" acompanharem a regra do banco.

Nenhuma alteração no checkout, contrato ou fluxo de pagamento.
