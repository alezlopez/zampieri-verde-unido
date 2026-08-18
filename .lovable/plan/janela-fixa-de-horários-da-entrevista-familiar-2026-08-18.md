# Janela fixa de horários da Entrevista Familiar

Hoje existe 1 regra por dia útil (seg–sex, 08:00–17:00, blocos de 45 min) e os horários são oferecidos por até 45 dias à frente. Vamos passar para duas janelas fixas, intervalo de 30 min e visão de 7 dias.

## Como fica

- Janelas fixas (internas): **08:00–10:30** e **13:30–16:00**.
- Somente dias úteis (seg–sex). Feriados continuam pelos bloqueios já cadastrados.
- Intervalo entre horários: **30 minutos** (ajustável só por você no admin).
- O responsável vê horários de **hoje até 7 dias à frente** (mantida a antecedência mínima de 2h já existente).

Horários gerados por dia: 08:00, 08:30, 09:00, 09:30, 10:00 / 13:30, 14:00, 14:30, 15:00, 15:30.

## Tela de agenda no admin

A tela passa a mostrar as duas janelas como fixas (somente leitura) e deixa editável apenas:
- duração/intervalo entre horários (padrão 30 min);
- capacidade simultânea por horário;
- ativar/desativar o dia da semana.

Os bloqueios de datas continuam como estão.

## Detalhes técnicos

- Migration: substituir as 5 regras atuais por 10 (seg–sex × 2 janelas), `hora_inicio/hora_fim` 08:00–10:30 e 13:30–16:00, `duracao_min = 30`, capacidade mantida.
- `supabase/functions/_shared/prematricula-slots.ts`: `DIAS_A_FRENTE` de 45 para 7. O gerador já suporta múltiplas regras por dia, sem outras mudanças.
- `src/pages/PreMatriculaAgenda.tsx`: passar de "uma regra por dia" para as duas janelas por dia, com horários fixos exibidos e edição só de duração/capacidade/ativo.
- Sem mudanças no fluxo de agendamento, notificações ou status.
