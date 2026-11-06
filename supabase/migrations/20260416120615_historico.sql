-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260416120615).


-- Fix get_current_message_period: rename internal vars to avoid ambiguity
CREATE OR REPLACE FUNCTION public.get_current_message_period()
RETURNS TABLE(period_start date, period_end date, messages_sent integer, max_messages integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  IF EXTRACT(DAY FROM CURRENT_DATE) >= 15 THEN
    v_start := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
    v_end   := (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '14 days')::date;
  ELSE
    v_start := (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '14 days')::date;
    v_end   := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
  END IF;

  INSERT INTO message_usage (period_start, period_end)
  VALUES (v_start, v_end)
  ON CONFLICT ON CONSTRAINT message_usage_period_start_key DO NOTHING;

  RETURN QUERY
  SELECT mu.period_start, mu.period_end, mu.messages_sent, mu.max_messages
  FROM message_usage mu
  WHERE mu.period_start = v_start;
END;
$$;

-- Fix increment_message_count: ensure period exists before updating
CREATE OR REPLACE FUNCTION public.increment_message_count(count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  IF EXTRACT(DAY FROM CURRENT_DATE) >= 15 THEN
    v_start := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
    v_end   := (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '14 days')::date;
  ELSE
    v_start := (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '14 days')::date;
    v_end   := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
  END IF;

  INSERT INTO message_usage (period_start, period_end)
  VALUES (v_start, v_end)
  ON CONFLICT ON CONSTRAINT message_usage_period_start_key DO NOTHING;

  UPDATE message_usage
  SET messages_sent = messages_sent + count
  WHERE message_usage.period_start = v_start;
END;
$$;

-- Restrict EXECUTE to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_current_message_period() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_message_period() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_message_count(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_message_count(integer) TO authenticated;
