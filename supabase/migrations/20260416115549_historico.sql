-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260416115549).

CREATE OR REPLACE FUNCTION public.get_current_message_period()
RETURNS TABLE(period_start date, period_end date, messages_sent integer, max_messages integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  IF EXTRACT(DAY FROM CURRENT_DATE) >= 15 THEN
    v_start := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
    v_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '14 days')::date;
  ELSE
    v_start := (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '14 days')::date;
    v_end := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
  END IF;

  INSERT INTO message_usage (period_start, period_end)
  VALUES (v_start, v_end)
  ON CONFLICT (period_start) DO NOTHING;

  RETURN QUERY SELECT mu.period_start, mu.period_end, mu.messages_sent, mu.max_messages
  FROM message_usage mu WHERE mu.period_start = v_start;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_message_count(count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start date;
BEGIN
  IF EXTRACT(DAY FROM CURRENT_DATE) >= 15 THEN
    v_start := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
  ELSE
    v_start := (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '14 days')::date;
  END IF;
  UPDATE message_usage SET messages_sent = messages_sent + count WHERE period_start = v_start;
END;
$$;
