-- 1. Tabela de valores de rematrícula por curso
CREATE TABLE IF NOT EXISTS public.rematricula_valores_2027 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_2027 text NOT NULL UNIQUE,
  valor_rematricula numeric NOT NULL DEFAULT 0,
  valor_promocional numeric,
  promocao_ate date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rematricula_valores_2027 TO anon;
GRANT SELECT ON public.rematricula_valores_2027 TO authenticated;
GRANT ALL ON public.rematricula_valores_2027 TO service_role;

ALTER TABLE public.rematricula_valores_2027 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "valores_2027_leitura_publica" ON public.rematricula_valores_2027;
CREATE POLICY "valores_2027_leitura_publica"
  ON public.rematricula_valores_2027 FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "valores_2027_admin_gerencia" ON public.rematricula_valores_2027;
CREATE POLICY "valores_2027_admin_gerencia"
  ON public.rematricula_valores_2027 FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_valores_2027_updated_at ON public.rematricula_valores_2027;
CREATE TRIGGER trg_valores_2027_updated_at
  BEFORE UPDATE ON public.rematricula_valores_2027
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rematricula_valores_2027 (curso_2027, valor_rematricula)
SELECT DISTINCT a.curso_2027, 0
FROM public.alunos_rematricula_2027 a
WHERE COALESCE(trim(a.curso_2027), '') <> ''
ON CONFLICT (curso_2027) DO NOTHING;

-- 2. Tabela de vagas 2027
CREATE TABLE IF NOT EXISTS public.vagas_2027 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_2027 text NOT NULL,
  turno text NOT NULL,
  max_vagas integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curso_2027, turno)
);

GRANT SELECT ON public.vagas_2027 TO anon;
GRANT SELECT ON public.vagas_2027 TO authenticated;
GRANT ALL ON public.vagas_2027 TO service_role;

ALTER TABLE public.vagas_2027 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vagas_2027_leitura_publica" ON public.vagas_2027;
CREATE POLICY "vagas_2027_leitura_publica"
  ON public.vagas_2027 FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "vagas_2027_admin_gerencia" ON public.vagas_2027;
CREATE POLICY "vagas_2027_admin_gerencia"
  ON public.vagas_2027 FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_vagas_2027_updated_at ON public.vagas_2027;
CREATE TRIGGER trg_vagas_2027_updated_at
  BEFORE UPDATE ON public.vagas_2027
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Buscar aluno por telefone ou CPF (dados mínimos)
CREATE OR REPLACE FUNCTION public.rematricula_2027_buscar(p_termo text)
RETURNS TABLE(id_aluno bigint, nome_aluno text, curso_atual text, curso_2027 text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v text;
BEGIN
  v := regexp_replace(COALESCE(p_termo, ''), '[^0-9]', '', 'g');
  IF length(v) < 10 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id_aluno, a.nome_aluno, a.curso_atual, a.curso_2027
  FROM public.alunos_rematricula_2027 a
  WHERE regexp_replace(COALESCE(a.celular_pai, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.celular_mae, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.cpf_pai, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.cpf_mae, ''), '[^0-9]', '', 'g') = v
     OR regexp_replace(COALESCE(a.cpf_aluno, ''), '[^0-9]', '', 'g') = v
  ORDER BY a.nome_aluno;
END;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_buscar(text) FROM public;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_buscar(text) TO anon, authenticated, service_role;

-- 4. Abrir cadastro completo mediante data de nascimento
CREATE OR REPLACE FUNCTION public.rematricula_2027_abrir(p_id_aluno bigint, p_data_nascimento date)
RETURNS TABLE(
  id_aluno bigint, nome_aluno text, cpf_aluno text, data_nascimento_aluno date,
  curso_atual text, curso_2027 text,
  valor_cheio numeric, valor_com_desconto numeric, percentual_desconto numeric, dia_vencimento smallint,
  responsavel_financeiro text, turno_escolhido text,
  tem_pai text, nome_pai text, cpf_pai text, rg_pai text, estado_civil_pai text, naturalidade_pai text,
  nacionalidade_pai text, cep_pai text, logradouro_pai text, numero_pai text, complemento_pai text,
  cidade_pai text, estado_pai text, data_nascimento_pai date, celular_pai text, email_pai text,
  tem_mae text, nome_mae text, cpf_mae text, rg_mae text, estado_civil_mae text, naturalidade_mae text,
  nacionalidade_mae text, cep_mae text, logradouro_mae text, numero_mae text, complemento_mae text,
  cidade_mae text, estado_mae text, data_nascimento_mae date, celular_mae text, email_mae text,
  valor_rematricula numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id_aluno, a.nome_aluno, a.cpf_aluno, a.data_nascimento_aluno,
    a.curso_atual, a.curso_2027,
    a.valor_cheio, a.valor_com_desconto, a.percentual_desconto, a.dia_vencimento,
    a.responsavel_financeiro, a.turno_escolhido,
    a.tem_pai, a.nome_pai, a.cpf_pai, a.rg_pai, a.estado_civil_pai, a.naturalidade_pai,
    a.nacionalidade_pai, a.cep_pai, a.logradouro_pai, a.numero_pai, a.complemento_pai,
    a.cidade_pai, a.estado_pai, a.data_nascimento_pai, a.celular_pai, a.email_pai,
    a.tem_mae, a.nome_mae, a.cpf_mae, a.rg_mae, a.estado_civil_mae, a.naturalidade_mae,
    a.nacionalidade_mae, a.cep_mae, a.logradouro_mae, a.numero_mae, a.complemento_mae,
    a.cidade_mae, a.estado_mae, a.data_nascimento_mae, a.celular_mae, a.email_mae,
    COALESCE(
      CASE
        WHEN v.valor_promocional IS NOT NULL
          AND (v.promocao_ate IS NULL OR v.promocao_ate >= CURRENT_DATE)
        THEN v.valor_promocional
        ELSE v.valor_rematricula
      END, 0)::numeric
  FROM public.alunos_rematricula_2027 a
  LEFT JOIN public.rematricula_valores_2027 v
    ON v.curso_2027 = a.curso_2027 AND v.ativo = true
  WHERE a.id_aluno = p_id_aluno
    AND a.data_nascimento_aluno = p_data_nascimento
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_abrir(bigint, date) FROM public;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_abrir(bigint, date) TO anon, authenticated, service_role;

-- 5. Turnos disponíveis por curso
CREATE OR REPLACE FUNCTION public.rematricula_2027_turnos(p_curso_2027 text)
RETURNS TABLE(turno text, max_vagas integer, ocupadas integer, disponiveis integer, disponivel boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vt.turno,
    vt.max_vagas,
    COALESCE(oc.qtd, 0)::integer,
    GREATEST(vt.max_vagas - COALESCE(oc.qtd, 0), 0)::integer,
    (vt.max_vagas - COALESCE(oc.qtd, 0)) > 0
  FROM public.vagas_2027 vt
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS qtd
    FROM public.alunos_rematricula_2027 a
    WHERE a.curso_2027 = vt.curso_2027
      AND lower(trim(a.turno_escolhido)) = lower(trim(vt.turno))
  ) oc ON true
  WHERE vt.ativo = true
    AND vt.curso_2027 = p_curso_2027
  ORDER BY vt.turno;
END;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_turnos(text) FROM public;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_turnos(text) TO anon, authenticated, service_role;

-- 6. Salvar dados do fluxo
CREATE OR REPLACE FUNCTION public.rematricula_2027_salvar(
  p_id_aluno bigint,
  p_data_nascimento date,
  p_dados jsonb
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aluno public.alunos_rematricula_2027%ROWTYPE;
  v_turno text;
  v_max integer;
  v_ocupadas integer;
BEGIN
  SELECT * INTO v_aluno
  FROM public.alunos_rematricula_2027
  WHERE id_aluno = p_id_aluno AND data_nascimento_aluno = p_data_nascimento
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'nao_autorizado'::text;
    RETURN;
  END IF;

  v_turno := NULLIF(trim(COALESCE(p_dados->>'turno_escolhido', '')), '');

  IF v_turno IS NOT NULL
     AND lower(COALESCE(v_aluno.turno_escolhido, '')) IS DISTINCT FROM lower(v_turno) THEN
    SELECT vt.max_vagas INTO v_max
    FROM public.vagas_2027 vt
    WHERE vt.ativo = true
      AND vt.curso_2027 = v_aluno.curso_2027
      AND lower(trim(vt.turno)) = lower(v_turno);

    IF v_max IS NULL THEN
      RETURN QUERY SELECT false, 'turno_indisponivel'::text;
      RETURN;
    END IF;

    SELECT COUNT(*)::integer INTO v_ocupadas
    FROM public.alunos_rematricula_2027 a
    WHERE a.curso_2027 = v_aluno.curso_2027
      AND lower(trim(a.turno_escolhido)) = lower(v_turno);

    IF v_ocupadas >= v_max THEN
      RETURN QUERY SELECT false, 'sem_vagas'::text;
      RETURN;
    END IF;
  END IF;

  UPDATE public.alunos_rematricula_2027 a SET
    cpf_aluno = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cpf_aluno','')), ''), a.cpf_aluno),

    nome_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nome_mae','')), ''), a.nome_mae),
    cpf_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cpf_mae','')), ''), a.cpf_mae),
    rg_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'rg_mae','')), ''), a.rg_mae),
    estado_civil_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_civil_mae','')), ''), a.estado_civil_mae),
    naturalidade_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'naturalidade_mae','')), ''), a.naturalidade_mae),
    nacionalidade_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nacionalidade_mae','')), ''), a.nacionalidade_mae),
    cep_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cep_mae','')), ''), a.cep_mae),
    logradouro_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'logradouro_mae','')), ''), a.logradouro_mae),
    numero_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'numero_mae','')), ''), a.numero_mae),
    complemento_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'complemento_mae','')), ''), a.complemento_mae),
    cidade_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cidade_mae','')), ''), a.cidade_mae),
    estado_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_mae','')), ''), a.estado_mae),
    data_nascimento_mae = COALESCE((NULLIF(trim(COALESCE(p_dados->>'data_nascimento_mae','')), ''))::date, a.data_nascimento_mae),
    celular_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'celular_mae','')), ''), a.celular_mae),
    email_mae = COALESCE(NULLIF(trim(COALESCE(p_dados->>'email_mae','')), ''), a.email_mae),

    nome_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nome_pai','')), ''), a.nome_pai),
    cpf_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cpf_pai','')), ''), a.cpf_pai),
    rg_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'rg_pai','')), ''), a.rg_pai),
    estado_civil_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_civil_pai','')), ''), a.estado_civil_pai),
    naturalidade_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'naturalidade_pai','')), ''), a.naturalidade_pai),
    nacionalidade_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'nacionalidade_pai','')), ''), a.nacionalidade_pai),
    cep_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cep_pai','')), ''), a.cep_pai),
    logradouro_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'logradouro_pai','')), ''), a.logradouro_pai),
    numero_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'numero_pai','')), ''), a.numero_pai),
    complemento_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'complemento_pai','')), ''), a.complemento_pai),
    cidade_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'cidade_pai','')), ''), a.cidade_pai),
    estado_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'estado_pai','')), ''), a.estado_pai),
    data_nascimento_pai = COALESCE((NULLIF(trim(COALESCE(p_dados->>'data_nascimento_pai','')), ''))::date, a.data_nascimento_pai),
    celular_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'celular_pai','')), ''), a.celular_pai),
    email_pai = COALESCE(NULLIF(trim(COALESCE(p_dados->>'email_pai','')), ''), a.email_pai),

    turno_escolhido = COALESCE(v_turno, a.turno_escolhido),
    responsavel_financeiro = COALESCE(NULLIF(trim(COALESCE(p_dados->>'responsavel_financeiro','')), ''), a.responsavel_financeiro),
    updated_at = now()
  WHERE a.id_aluno = p_id_aluno;

  RETURN QUERY SELECT true, 'ok'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.rematricula_2027_salvar(bigint, date, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_salvar(bigint, date, jsonb) TO anon, authenticated, service_role;