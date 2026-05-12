-- Eventos: meia-entrada
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS meia_entrada_habilitada boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS percentual_meia integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS preco_meia numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_meia_parcelado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categorias_meia text[] NOT NULL DEFAULT ARRAY['estudante','idoso','pcd','pcd_acompanhante','professor']::text[];

-- Backfill preço meia
UPDATE public.eventos
SET preco_meia = ROUND(preco / 2.0, 2),
    preco_meia_parcelado = ROUND(preco_parcelado / 2.0, 2)
WHERE preco_meia = 0;

-- Ingressos: meia-entrada
ALTER TABLE public.ingressos
  ADD COLUMN IF NOT EXISTS tipo_ingresso text NOT NULL DEFAULT 'inteira',
  ADD COLUMN IF NOT EXISTS categoria_meia text,
  ADD COLUMN IF NOT EXISTS declaracao_meia_aceita boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declaracao_meia_aceita_em timestamptz,
  ADD COLUMN IF NOT EXISTS meia_validada_portaria boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meia_validada_em timestamptz,
  ADD COLUMN IF NOT EXISTS meia_validada_por uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingressos_tipo_ingresso_check') THEN
    ALTER TABLE public.ingressos
      ADD CONSTRAINT ingressos_tipo_ingresso_check CHECK (tipo_ingresso IN ('inteira','meia'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingressos_categoria_meia_check') THEN
    ALTER TABLE public.ingressos
      ADD CONSTRAINT ingressos_categoria_meia_check
      CHECK (categoria_meia IS NULL OR categoria_meia IN ('estudante','idoso','pcd','pcd_acompanhante','professor'));
  END IF;
END $$;

-- RPC: contar meias do evento
CREATE OR REPLACE FUNCTION public.contar_meias_evento(p_evento_id uuid)
RETURNS TABLE(vagas_total integer, percentual_meia integer, vagas_meia_total integer, meias_vendidas integer, meias_disponiveis integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total integer;
  v_pct integer;
  v_cota integer;
  v_vendidas integer;
BEGIN
  SELECT e.vagas_total, e.percentual_meia INTO v_total, v_pct
  FROM eventos e WHERE e.id = p_evento_id;
  IF v_total IS NULL THEN
    RETURN;
  END IF;
  v_cota := FLOOR(v_total * v_pct / 100.0)::int;
  SELECT COUNT(*) INTO v_vendidas FROM ingressos
  WHERE evento_id = p_evento_id
    AND tipo_ingresso = 'meia'
    AND status IN ('pendente','pago');
  RETURN QUERY SELECT v_total, v_pct, v_cota, v_vendidas, GREATEST(v_cota - v_vendidas, 0);
END;
$$;

-- Trigger: validar cota de meia no INSERT
CREATE OR REPLACE FUNCTION public.validar_cota_meia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total integer;
  v_pct integer;
  v_cota integer;
  v_vendidas integer;
BEGIN
  IF NEW.tipo_ingresso <> 'meia' THEN
    RETURN NEW;
  END IF;
  SELECT vagas_total, percentual_meia INTO v_total, v_pct
  FROM eventos WHERE id = NEW.evento_id;
  v_cota := FLOOR(v_total * v_pct / 100.0)::int;
  SELECT COUNT(*) INTO v_vendidas FROM ingressos
  WHERE evento_id = NEW.evento_id
    AND tipo_ingresso = 'meia'
    AND status IN ('pendente','pago');
  IF v_vendidas >= v_cota THEN
    RAISE EXCEPTION 'cota_meia_esgotada' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_cota_meia ON public.ingressos;
CREATE TRIGGER trg_validar_cota_meia
  BEFORE INSERT ON public.ingressos
  FOR EACH ROW EXECUTE FUNCTION public.validar_cota_meia();