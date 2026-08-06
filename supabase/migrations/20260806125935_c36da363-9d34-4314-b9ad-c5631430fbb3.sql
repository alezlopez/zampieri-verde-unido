CREATE TABLE public.rematricula_2027_numeros_sorte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_aluno bigint NOT NULL REFERENCES public.alunos_rematricula_2027(id_aluno) ON DELETE CASCADE,
  numero text NOT NULL,
  faixa text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rematricula_2027_numeros_sorte_numero_key
  ON public.rematricula_2027_numeros_sorte (numero);
CREATE INDEX rematricula_2027_numeros_sorte_aluno_idx
  ON public.rematricula_2027_numeros_sorte (id_aluno);

GRANT ALL ON public.rematricula_2027_numeros_sorte TO service_role;

ALTER TABLE public.rematricula_2027_numeros_sorte ENABLE ROW LEVEL SECURITY;

-- Sem políticas: leitura apenas via RPCs SECURITY DEFINER abaixo.

CREATE OR REPLACE FUNCTION public.gerar_numeros_sorte_2027(p_id_aluno bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_qtd integer := 0;
  v_faixa text;
  v_gerados integer := 0;
  v_num text;
  v_try integer;
BEGIN
  IF v_hoje BETWEEN DATE '2026-08-24' AND DATE '2026-09-08' THEN
    v_qtd := 6; v_faixa := '24/08 a 08/09';
  ELSIF v_hoje BETWEEN DATE '2026-09-09' AND DATE '2026-09-30' THEN
    v_qtd := 3; v_faixa := '09/09 a 30/09';
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
$$;

CREATE OR REPLACE FUNCTION public.trg_gerar_numeros_sorte_2027()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.rematricula_concluida, false) = true
     AND COALESCE(OLD.rematricula_concluida, false) = false THEN
    PERFORM public.gerar_numeros_sorte_2027(NEW.id_aluno);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gerar_numeros_sorte_2027 ON public.alunos_rematricula_2027;
CREATE TRIGGER gerar_numeros_sorte_2027
AFTER UPDATE OF rematricula_concluida ON public.alunos_rematricula_2027
FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numeros_sorte_2027();

CREATE OR REPLACE FUNCTION public.rematricula_2027_numeros_consultar(p_termo text, p_data_nascimento date)
RETURNS TABLE(id_aluno bigint, nome_aluno text, curso_2027 text, numero text, faixa text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v text;
BEGIN
  v := regexp_replace(COALESCE(p_termo, ''), '[^0-9]', '', 'g');
  IF length(v) < 10 OR p_data_nascimento IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.rematricula_2027_rate_hit('numeros', 20, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  RETURN QUERY
  SELECT a.id_aluno, a.nome_aluno, a.curso_2027, n.numero, n.faixa
  FROM public.alunos_rematricula_2027 a
  JOIN public.rematricula_2027_numeros_sorte n ON n.id_aluno = a.id_aluno
  WHERE a.data_nascimento_aluno = p_data_nascimento
    AND (
      regexp_replace(COALESCE(a.celular_pai, ''), '[^0-9]', '', 'g') = v
      OR regexp_replace(COALESCE(a.celular_mae, ''), '[^0-9]', '', 'g') = v
      OR regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = v
      OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = v
      OR regexp_replace(COALESCE(a.cpf_aluno, ''), '[^0-9]', '', 'g') = v
    )
  ORDER BY n.numero;
END;
$$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_numeros_do_aluno(p_id_aluno bigint, p_data_nascimento date)
RETURNS TABLE(numero text, faixa text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT n.numero, n.faixa
  FROM public.rematricula_2027_numeros_sorte n
  JOIN public.alunos_rematricula_2027 a ON a.id_aluno = n.id_aluno
  WHERE a.id_aluno = p_id_aluno
    AND a.data_nascimento_aluno = p_data_nascimento
  ORDER BY n.numero;
END;
$$;

CREATE OR REPLACE FUNCTION public.rematricula_2027_admin_listagem()
RETURNS TABLE(
  id_aluno bigint,
  nome_aluno text,
  curso_atual text,
  curso_2027 text,
  turno_escolhido text,
  responsavel_financeiro text,
  contrato_gerado boolean,
  contrato_assinado boolean,
  rematricula_concluida boolean,
  forma_pagamento text,
  parcelas integer,
  valor_pago numeric,
  data_pagamento timestamptz,
  link_contrato text,
  numeros text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id_aluno, a.nome_aluno, a.curso_atual, a.curso_2027, a.turno_escolhido,
         a.responsavel_financeiro,
         COALESCE(a.contrato_gerado, false), COALESCE(a.contrato_assinado, false),
         COALESCE(a.rematricula_concluida, false),
         a.forma_pagamento, a.parcelas, a.valor_pago, a.data_pagamento, a.link_contrato,
         COALESCE(ARRAY(
           SELECT n.numero FROM public.rematricula_2027_numeros_sorte n
           WHERE n.id_aluno = a.id_aluno ORDER BY n.numero
         ), ARRAY[]::text[])
  FROM public.alunos_rematricula_2027 a
  ORDER BY a.nome_aluno;
END;
$$;
