-- Renegociação 2027: bloqueio da rematrícula derivado de devedores_2027 e importação segura da lista.

-- 1) Recalcula só quando muda, para não disparar log/notificação de alunos_rematricula_2027 à toa
CREATE OR REPLACE FUNCTION public.renegociacao_2027_recalcular_liberacao(p_id_aluno bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_abertos integer;
BEGIN
  SELECT count(*) INTO v_abertos
  FROM public.devedores_2027 d
  WHERE d.id_aluno = p_id_aluno AND COALESCE(d.pago, false) = false;

  UPDATE public.alunos_rematricula_2027
     SET rematricula_liberada = (v_abertos = 0),
         updated_at = now()
   WHERE id_aluno = p_id_aluno
     AND rematricula_liberada IS DISTINCT FROM (v_abertos = 0);

  RETURN v_abertos = 0;
END;
$function$;

-- 2) Qualquer inclusão, exclusão ou baixa em devedores_2027 recalcula o bloqueio do aluno
CREATE OR REPLACE FUNCTION public.trg_devedores_2027_liberacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.renegociacao_2027_recalcular_liberacao(OLD.id_aluno);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.id_aluno IS DISTINCT FROM OLD.id_aluno OR NEW.pago IS DISTINCT FROM OLD.pago) THEN
    PERFORM public.renegociacao_2027_recalcular_liberacao(NEW.id_aluno);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS devedores_2027_liberacao ON public.devedores_2027;
CREATE TRIGGER devedores_2027_liberacao
  AFTER INSERT OR DELETE OR UPDATE OF pago, id_aluno ON public.devedores_2027
  FOR EACH ROW EXECUTE FUNCTION public.trg_devedores_2027_liberacao();

-- 3) Importação não notifica "débito quitado" linha a linha
CREATE OR REPLACE FUNCTION public.trg_notif_devedor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('zampieri.importando_devedores', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.pago AND NOT COALESCE(OLD.pago,false) THEN
    PERFORM public.notificar_admin('rematricula','debito_pago',
      'Débito quitado',
      COALESCE(NEW.nome_aluno,'Aluno') || ' — ' || COALESCE(NEW.evento,''),
      '/renegociacao/admin', NEW.id_aluno::text);
  END IF;
  RETURN NEW;
END; $function$;

-- 4) Chave natural do débito (row_id já é identity e continua sendo gerado pelo banco)
CREATE UNIQUE INDEX IF NOT EXISTS devedores_2027_chave_uq
  ON public.devedores_2027 (id_aluno, evento, vencimento);

SELECT setval(pg_get_serial_sequence('public.devedores_2027', 'row_id'),
              GREATEST((SELECT COALESCE(max(row_id), 0) FROM public.devedores_2027), 1));

-- 5) Importa a lista completa de devedores.
--    p_linhas: [{id_aluno, nome_aluno, evento, vencimento (AAAA-MM-DD), valor_principal, juros, multa, valor_a_vista, valor_parcelado}]
--    - débito novo: insere
--    - débito existente em aberto: atualiza valores
--    - débito já pago: não mexe
--    - débito em aberto que sumiu da lista: dá baixa como 'quitado_fora' (não apaga, para não quebrar checkout em andamento)
CREATE OR REPLACE FUNCTION public.renegociacao_2027_importar(p_linhas jsonb, p_baixar_ausentes boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inseridos int;
  v_atualizados int;
  v_baixados int := 0;
  v_ignorados_pagos int;
  v_sem_cadastro jsonb;
BEGIN
  IF jsonb_typeof(p_linhas) IS DISTINCT FROM 'array' OR jsonb_array_length(p_linhas) = 0 THEN
    RAISE EXCEPTION 'lista_vazia';
  END IF;

  PERFORM set_config('zampieri.importando_devedores', '1', true);

  DROP TABLE IF EXISTS _imp;
  CREATE TEMP TABLE _imp ON COMMIT DROP AS
  SELECT (l->>'id_aluno')::bigint AS id_aluno,
         NULLIF(trim(l->>'nome_aluno'), '') AS nome_aluno,
         COALESCE(NULLIF(trim(l->>'evento'), ''), 'Mensalidade') AS evento,
         to_char((l->>'vencimento')::date, 'YYYY-MM-DD') AS vencimento,
         (l->>'valor_principal')::numeric AS valor_principal,
         COALESCE((l->>'juros')::numeric, 0) AS juros,
         COALESCE((l->>'multa')::numeric, 0) AS multa,
         (l->>'valor_a_vista')::numeric AS valor_a_vista,
         (l->>'valor_parcelado')::numeric AS valor_parcelado
  FROM jsonb_array_elements(p_linhas) l;

  IF EXISTS (SELECT 1 FROM _imp WHERE id_aluno IS NULL OR vencimento IS NULL OR valor_a_vista IS NULL OR valor_a_vista <= 0) THEN
    RAISE EXCEPTION 'linha_invalida: id_aluno, vencimento e valor_a_vista (> 0) são obrigatórios';
  END IF;
  IF EXISTS (SELECT 1 FROM _imp GROUP BY id_aluno, evento, vencimento HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'linha_duplicada: mesmo aluno, evento e vencimento aparecem mais de uma vez';
  END IF;

  SELECT count(*) INTO v_ignorados_pagos
  FROM _imp i JOIN public.devedores_2027 d USING (id_aluno, evento, vencimento)
  WHERE d.pago;

  UPDATE public.devedores_2027 d
     SET nome_aluno = COALESCE(i.nome_aluno, d.nome_aluno),
         valor_principal = i.valor_principal, juros = i.juros, multa = i.multa,
         valor_a_vista = i.valor_a_vista,
         valor_parcelado = COALESCE(i.valor_parcelado, i.valor_a_vista)
    FROM _imp i
   WHERE d.id_aluno = i.id_aluno AND d.evento = i.evento AND d.vencimento = i.vencimento
     AND NOT d.pago;
  GET DIAGNOSTICS v_atualizados = ROW_COUNT;

  INSERT INTO public.devedores_2027 (id_aluno, nome_aluno, evento, vencimento, valor_principal, juros, multa, valor_a_vista, valor_parcelado)
  SELECT i.id_aluno, i.nome_aluno, i.evento, i.vencimento, i.valor_principal, i.juros, i.multa,
         i.valor_a_vista, COALESCE(i.valor_parcelado, i.valor_a_vista)
  FROM _imp i
  WHERE NOT EXISTS (SELECT 1 FROM public.devedores_2027 d
                    WHERE d.id_aluno = i.id_aluno AND d.evento = i.evento AND d.vencimento = i.vencimento);
  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  IF p_baixar_ausentes THEN
    UPDATE public.devedores_2027 d
       SET pago = true, pago_em = now(), forma_pagamento = 'quitado_fora'
     WHERE NOT d.pago
       AND NOT EXISTS (SELECT 1 FROM _imp i
                       WHERE i.id_aluno = d.id_aluno AND i.evento = d.evento AND i.vencimento = d.vencimento);
    GET DIAGNOSTICS v_baixados = ROW_COUNT;
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id_aluno', i.id_aluno, 'nome_aluno', i.nome_aluno)), '[]'::jsonb)
    INTO v_sem_cadastro
  FROM _imp i
  WHERE NOT EXISTS (SELECT 1 FROM public.alunos_rematricula_2027 a WHERE a.id_aluno = i.id_aluno);

  RETURN jsonb_build_object(
    'linhas_recebidas', jsonb_array_length(p_linhas),
    'inseridos', v_inseridos,
    'atualizados', v_atualizados,
    'ja_pagos_ignorados', v_ignorados_pagos,
    'baixados_por_ausencia', v_baixados,
    'sem_cadastro_rematricula', v_sem_cadastro
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.renegociacao_2027_importar(jsonb, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_devedores_2027_liberacao() FROM PUBLIC, anon, authenticated;
