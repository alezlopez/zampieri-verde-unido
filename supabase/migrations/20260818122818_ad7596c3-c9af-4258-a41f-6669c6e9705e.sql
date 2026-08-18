DELETE FROM public.prematricula_agenda_regras;
INSERT INTO public.prematricula_agenda_regras (dia_semana, hora_inicio, hora_fim, duracao_min, capacidade, ativo)
SELECT d, j.ini, j.fim, 30, 1, true
FROM generate_series(1,5) AS d,
     (VALUES ('08:00'::time,'10:30'::time), ('13:30'::time,'16:00'::time)) AS j(ini, fim);