-- Turmas que podem ir em cada evento (pedido do Alexandre, nov/2026): famílias compravam a excursão de
-- outra série (Cidade das Crianças no lugar do Wet'n Wild). NULL ou vazio = todas as turmas, como antes.
-- Os valores são o texto exato de alunos_26.curso (ex.: "Ensino Fundamental II - 7º Ano C"), porque o
-- nome curto se repete entre segmentos ("1º Ano A" existe no Fundamental I e no Médio).

ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS turmas_permitidas text[];
COMMENT ON COLUMN public.eventos.turmas_permitidas IS
  'Turmas (texto exato de alunos_26.curso) que podem comprar ingresso de aluno. NULL ou vazio = todas.';

-- Lista de turmas atuais: formulário do evento e resumo "para quais turmas" na página pública
-- (só nomes de turma, sem dado de aluno)
CREATE OR REPLACE FUNCTION public.listar_turmas()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT curso FROM public.alunos_26 WHERE coalesce(trim(curso), '') <> '' ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.listar_turmas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_turmas() TO anon, authenticated;

-- Trava no banco: ingresso de aluno só para turma permitida. A tela já bloqueia, mas o ingresso é criado
-- direto pelo navegador da família; isto vale para qualquer caminho (inclusive página aberta antes da mudança).
-- Equipe de eventos/admin e o servidor passam, para exceções lançadas à mão.
CREATE OR REPLACE FUNCTION public.validar_turma_ingresso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turmas text[];
  v_curso text;
BEGIN
  IF NEW.tipo_participante IS DISTINCT FROM 'aluno' OR NEW.codigo_aluno IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT turmas_permitidas INTO v_turmas FROM public.eventos WHERE id = NEW.evento_id;
  IF v_turmas IS NULL OR cardinality(v_turmas) = 0 THEN
    RETURN NEW;
  END IF;

  IF coalesce(auth.role(), '') = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_setor(auth.uid(), 'eventos') THEN
    RETURN NEW;
  END IF;

  SELECT curso INTO v_curso FROM public.alunos_26 WHERE codigo_aluno = NEW.codigo_aluno LIMIT 1;
  IF v_curso IS NULL OR NOT (v_curso = ANY (v_turmas)) THEN
    RAISE EXCEPTION 'turma_nao_permitida'
      USING DETAIL = format('Aluno %s (%s) fora das turmas do evento', NEW.codigo_aluno, coalesce(v_curso, 'sem turma')),
            HINT = 'Este evento não é para a turma deste aluno.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_turma_ingresso ON public.ingressos;
CREATE TRIGGER trg_validar_turma_ingresso
  BEFORE INSERT OR UPDATE OF evento_id, codigo_aluno ON public.ingressos
  FOR EACH ROW EXECUTE FUNCTION public.validar_turma_ingresso();
