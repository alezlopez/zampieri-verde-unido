# Fases automáticas de valores e números da sorte da rematrícula 2027

## O que muda para as famílias

Hoje o valor promocional é único e tem só uma data de validade. Passa a existir um calendário de fases que o sistema troca sozinho à meia-noite (horário de Brasília):

| Fase | Período | Números da sorte |
|---|---|---|
| 1 (atual) | 24/08 a 09/09 | 6 |
| 2 | 10/09 a 30/09 | 3 |
| 3 | 01/10 a 14/10 | 2 |
| 4 | 15/10 a 28/10 | 1 |
| Após 28/10 | valores da fase 4 continuam | nenhum |

Valores por série cursada em 2026 (à vista no PIX ou cartão / parcelado só no cartão, até 12x — regra inalterada):

| Série em 2026 | Fase 2 | Fase 3 | Fase 4 |
|---|---|---|---|
| Pré | 438,00 / 525,60 | 511,00 / 613,20 | 584,00 / 700,80 |
| 1º ano | 486,00 / 583,20 | 567,00 / 680,40 | 648,00 / 777,60 |
| 2º ao 5º | 546,00 / 655,20 | 637,00 / 764,40 | 728,00 / 873,60 |
| 6º ao 9º | 606,00 / 727,20 | 707,00 / 848,40 | 808,00 / 969,60 |
| Ensino médio | 630,00 / 756,00 | 735,00 / 882,00 | 840,00 / 1.008,00 |

Na tela da rematrícula o responsável continua vendo o valor cheio riscado, o valor da fase atual e até quando ele vale.

## Detalhes técnicos

**Banco (migrations)**

1. `rematricula_2027_fases` — `id`, `fase` (int, único), `inicio date`, `fim date` (nulo = sem fim), `numeros_sorte int`, `ativo bool`, timestamps. GRANTs: `service_role` total, `authenticated` leitura; RLS habilitada com leitura só para o setor `rematricula` (`has_setor`).
2. `rematricula_2027_fase_valores` — `id`, `fase_id` (FK), `curso_2027 text`, `valor_avista numeric`, `valor_parcelado numeric`, único por (`fase_id`,`curso_2027`). Mesmos GRANTs/RLS.
3. Seed das 4 fases: fase 1 replica os valores atuais de `rematricula_valores_2027` (fim 09/09, 6 números); fases 2, 3 e 4 com a tabela acima, mapeando as séries de 2026 para as linhas de `curso_2027` já existentes (mesmo agrupamento de hoje: Pré+1º / 2º / 3º-6º / 7º-9º+EM1º / EM2º-EM3º). Fase 4 fica com `fim = 2026-10-28` para os números da sorte, e a resolução de valor usa a última fase iniciada quando a data já passou do fim — assim os valores da fase 4 seguem valendo.
4. Função `rematricula_2027_valor_vigente(p_curso text)` (STABLE, SECURITY DEFINER, `search_path = public`) retornando `valor_avista`, `valor_parcelado`, `valor_cheio`, `fase`, `fase_fim`: escolhe a fase vigente pela data de Brasília; se a data for posterior à última fase, usa a última; fallback para `rematricula_valores_2027.valor_rematricula` quando não houver linha.
5. Recriar `rematricula_2027_status` e `rematricula_2027_abrir` usando essa função no lugar do `CASE` com `valor_promocional` / `promocao_ate`, mantendo assinatura, isenção (valor 0), `SECURITY DEFINER`, `search_path` e grants atuais.
6. Nova RPC pública `rematricula_2027_valores_curso(p_curso text)` para a tela consultar valor cheio, valor da fase e data-limite da fase (substitui o `select` direto em `rematricula_valores_2027` feito pelo frontend).
7. `gerar_numeros_sorte_2027`: substituir os `IF` fixos por consulta a `rematricula_2027_fases` (data de Brasília entre `inicio` e `fim`); fora de qualquer fase retorna 0. Rótulo da faixa gerado a partir do período da fase.

**Edge function `rematricula-2027-checkout`**

Trocar a leitura de `rematricula_valores_2027` + cálculo de `promoVigente` por uma chamada a `rematricula_2027_valor_vigente(curso_2027)`, usando `valor_avista` ou `valor_parcelado` conforme `isParcelado`. Nenhuma mudança em PIX, cartão, reaproveitamento de cobrança ou expiração.

**Frontend `src/components/rematricula/StepCurso.tsx`**

Consumir a nova RPC: riscado = valor cheio, destaque = valor da fase, aviso "Valor promocional válido até dd/mm" com o fim da fase (ocultado quando a fase não tem fim). Sem mudanças no fluxo de turno, responsável ou contrato.

Sem alterações em contrato, follow-up, admin ou regras de pagamento.
