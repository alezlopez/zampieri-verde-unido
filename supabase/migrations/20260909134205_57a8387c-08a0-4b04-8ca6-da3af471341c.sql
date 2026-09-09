
CREATE TABLE public.rematricula_2027_fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase integer NOT NULL UNIQUE,
  inicio date NOT NULL,
  fim date,
  numeros_sorte integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rematricula_2027_fases TO authenticated;
GRANT ALL ON public.rematricula_2027_fases TO service_role;
ALTER TABLE public.rematricula_2027_fases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Setor rematricula le fases"
  ON public.rematricula_2027_fases FOR SELECT TO authenticated
  USING (public.has_setor(auth.uid(), 'rematricula'));

CREATE TABLE public.rematricula_2027_fase_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id uuid NOT NULL REFERENCES public.rematricula_2027_fases(id) ON DELETE CASCADE,
  curso_2027 text NOT NULL,
  valor_avista numeric NOT NULL,
  valor_parcelado numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fase_id, curso_2027)
);

GRANT SELECT ON public.rematricula_2027_fase_valores TO authenticated;
GRANT ALL ON public.rematricula_2027_fase_valores TO service_role;
ALTER TABLE public.rematricula_2027_fase_valores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Setor rematricula le valores por fase"
  ON public.rematricula_2027_fase_valores FOR SELECT TO authenticated
  USING (public.has_setor(auth.uid(), 'rematricula'));

CREATE TRIGGER trg_fases_updated_at BEFORE UPDATE ON public.rematricula_2027_fases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fase_valores_updated_at BEFORE UPDATE ON public.rematricula_2027_fase_valores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rematricula_2027_fases (fase, inicio, fim, numeros_sorte) VALUES
  (1, DATE '2026-08-24', DATE '2026-09-09', 6),
  (2, DATE '2026-09-10', DATE '2026-09-30', 3),
  (3, DATE '2026-10-01', DATE '2026-10-14', 2),
  (4, DATE '2026-10-15', DATE '2026-10-28', 1);

-- Fase 1: replica os valores promocionais atuais
INSERT INTO public.rematricula_2027_fase_valores (fase_id, curso_2027, valor_avista, valor_parcelado)
SELECT f.id, v.curso_2027,
       COALESCE(v.valor_promocional, v.valor_rematricula),
       COALESCE(v.valor_promocional_pacelado, v.valor_rematricula)
FROM public.rematricula_valores_2027 v
CROSS JOIN public.rematricula_2027_fases f
WHERE f.fase = 1 AND v.ativo = true;

-- Fases 2 a 4
INSERT INTO public.rematricula_2027_fase_valores (fase_id, curso_2027, valor_avista, valor_parcelado)
SELECT f.id, d.curso_2027, d.avista, d.parcelado
FROM (VALUES
  (2, 'Educação Infantil - Pré', 438.00, 525.60),
  (2, 'Ensino Fundamental I - 1º Ano', 438.00, 525.60),
  (2, 'Ensino Fundamental I - 2º Ano', 486.00, 583.20),
  (2, 'Ensino Fundamental I - 3º Ano', 546.00, 655.20),
  (2, 'Ensino Fundamental I - 4º Ano', 546.00, 655.20),
  (2, 'Ensino Fundamental I - 5º Ano', 546.00, 655.20),
  (2, 'Ensino Fundamental II - 6º Ano', 546.00, 655.20),
  (2, 'Ensino Fundamental II - 7º Ano', 606.00, 727.20),
  (2, 'Ensino Fundamental II - 8º Ano', 606.00, 727.20),
  (2, 'Ensino Fundamental II - 9º Ano', 606.00, 727.20),
  (2, 'Ensino Médio - 1º Ano', 606.00, 727.20),
  (2, 'Ensino Médio - 2º Ano', 630.00, 756.00),
  (2, 'Ensino Médio - 3º Ano', 630.00, 756.00),
  (3, 'Educação Infantil - Pré', 511.00, 613.20),
  (3, 'Ensino Fundamental I - 1º Ano', 511.00, 613.20),
  (3, 'Ensino Fundamental I - 2º Ano', 567.00, 680.40),
  (3, 'Ensino Fundamental I - 3º Ano', 637.00, 764.40),
  (3, 'Ensino Fundamental I - 4º Ano', 637.00, 764.40),
  (3, 'Ensino Fundamental I - 5º Ano', 637.00, 764.40),
  (3, 'Ensino Fundamental II - 6º Ano', 637.00, 764.40),
  (3, 'Ensino Fundamental II - 7º Ano', 707.00, 848.40),
  (3, 'Ensino Fundamental II - 8º Ano', 707.00, 848.40),
  (3, 'Ensino Fundamental II - 9º Ano', 707.00, 848.40),
  (3, 'Ensino Médio - 1º Ano', 707.00, 848.40),
  (3, 'Ensino Médio - 2º Ano', 735.00, 882.00),
  (3, 'Ensino Médio - 3º Ano', 735.00, 882.00),
  (4, 'Educação Infantil - Pré', 584.00, 700.80),
  (4, 'Ensino Fundamental I - 1º Ano', 584.00, 700.80),
  (4, 'Ensino Fundamental I - 2º Ano', 648.00, 777.60),
  (4, 'Ensino Fundamental I - 3º Ano', 728.00, 873.60),
  (4, 'Ensino Fundamental I - 4º Ano', 728.00, 873.60),
  (4, 'Ensino Fundamental I - 5º Ano', 728.00, 873.60),
  (4, 'Ensino Fundamental II - 6º Ano', 728.00, 873.60),
  (4, 'Ensino Fundamental II - 7º Ano', 808.00, 969.60),
  (4, 'Ensino Fundamental II - 8º Ano', 808.00, 969.60),
  (4, 'Ensino Fundamental II - 9º Ano', 808.00, 969.60),
  (4, 'Ensino Médio - 1º Ano', 808.00, 969.60),
  (4, 'Ensino Médio - 2º Ano', 840.00, 1008.00),
  (4, 'Ensino Médio - 3º Ano', 840.00, 1008.00)
) AS d(fase, curso_2027, avista, parcelado)
JOIN public.rematricula_2027_fases f ON f.fase = d.fase;

CREATE OR REPLACE FUNCTION public.rematricula_2027_valor_vigente(p_curso text)
RETURNS TABLE(valor_avista numeric, valor_parcelado numeric, valor_cheio numeric, fase integer, fase_fim date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_fase_id uuid;
  v_fase integer;
  v_fim date;
  v_cheio numeric;
BEGIN
  SELECT v.valor_rematricula INTO v_cheio
  FROM public.rematricula_valores_2027 v
  WHERE v.curso_2027 = p_curso AND v.ativo = true
  LIMIT 1;

  SELECT f.id, f.fase, f.fim INTO v_fase_id, v_fase, v_fim
  FROM public.rematricula_2027_fases f
  WHERE f.ativo = true
    AND f.inicio <= v_hoje
    AND (f.fim IS NULL OR f.fim >= v_hoje)
  ORDER BY f.inicio DESC
  LIMIT 1;

  IF v_fase_id IS NULL THEN
    -- Depois da última fase: mantém os valores da última fase iniciada
    SELECT f.id, f.fase, f.fim INTO v_fase_id, v_fase, v_fim
    FROM public.rematricula_2027_fases f
    WHERE f.ativo = true AND f.inicio <= v_hoje
    ORDER BY f.inicio DESC
    LIMIT 1;
    v_fim := NULL;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(fv.valor_avista, v_cheio, 0)::numeric,
    COALESCE(fv.valor_parcelado, v_cheio, 0)::numeric,
    COALESCE(v_cheio, 0)::numeric,
    v_fase,
    v_fim
  FROM (SELECT 1) x
  LEFT JOIN public.rematricula_2027_fase_valores fv
    ON fv.fase_id = v_fase_id AND fv.curso_2027 = p_curso;
END;
$function$;

REVOKE ALL ON FUNCTION public.rematricula_2027_valor_vigente(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_valor_vigente(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rematricula_2027_valores_curso(p_curso text)
RETURNS TABLE(valor_cheio numeric, valor_avista numeric, valor_parcelado numeric, fase integer, fase_fim date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.valor_cheio, v.valor_avista, v.valor_parcelado, v.fase, v.fase_fim
  FROM public.rematricula_2027_valor_vigente(p_curso) v;
$function$;

REVOKE ALL ON FUNCTION public.rematricula_2027_valores_curso(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_valores_curso(text) TO anon, authenticated, service_role;

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
  v_inicio date;
  v_fim date;
  v_gerados integer := 0;
  v_num text;
  v_try integer;
BEGIN
  SELECT f.numeros_sorte, f.inicio, f.fim
    INTO v_qtd, v_inicio, v_fim
  FROM public.rematricula_2027_fases f
  WHERE f.ativo = true
    AND f.inicio <= v_hoje
    AND f.fim IS NOT NULL AND f.fim >= v_hoje
  ORDER BY f.inicio DESC
  LIMIT 1;

  IF v_qtd IS NULL OR v_qtd <= 0 THEN
    RETURN 0;
  END IF;

  v_faixa := to_char(v_inicio, 'DD/MM') || ' a ' || to_char(v_fim, 'DD/MM');

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
