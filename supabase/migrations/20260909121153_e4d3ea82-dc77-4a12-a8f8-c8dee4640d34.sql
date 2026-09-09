CREATE OR REPLACE FUNCTION public.gerar_numeros_sorte_2027(p_id_aluno bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_qtd integer := 0;
  v_faixa text;
  v_gerados integer := 0;
  v_num text;
  v_try integer;
BEGIN
  IF v_hoje BETWEEN DATE '2026-08-24' AND DATE '2026-09-09' THEN
    v_qtd := 6; v_faixa := '24/08 a 09/09';
  ELSIF v_hoje BETWEEN DATE '2026-09-10' AND DATE '2026-09-30' THEN
    v_qtd := 3; v_faixa := '10/09 a 30/09';
  ELSIF v_hoje BETWEEN DATE '2026-10-01' AND DATE '2026-10-16' THEN
    v_qtd := 2; v_faixa := '01/10 a 16/10';
  ELSIF v_hoje BETWEEN DATE '2026-10-17' AND DATE '2026-10-28' THEN
    v_qtd := 1; v_faixa := '17/10 a 28/10';
  ELSE
    RETURN 0;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('numeros_sorte_2027'));

  IF EXISTS (SELECT 1 FROM public.rematricula_2027_numeros_sorte WHERE id_aluno = p_id_aluno) THEN
    RETURN 0;
  END IF;

  WHILE v_gerados < v_qtd LOOP
    v_try := 0;
    LOOP
      v_try := v_try + 1;
      v_num := lpad(floor(random() * 10000)::int::text, 4, '0');
      BEGIN
        INSERT INTO public.rematricula_2027_numeros_sorte (id_aluno, numero, faixa)
        VALUES (p_id_aluno, v_num, v_faixa);
        v_gerados := v_gerados + 1;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_try > 500 THEN
          RAISE EXCEPTION 'sem_numeros_disponiveis';
        END IF;
      END;
    END LOOP;
  END LOOP;

  RETURN v_gerados;
END;
$function$;