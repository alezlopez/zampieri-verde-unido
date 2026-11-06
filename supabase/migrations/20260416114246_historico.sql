-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260416114246).


CREATE TABLE public.message_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  messages_sent integer NOT NULL DEFAULT 0,
  max_messages integer NOT NULL DEFAULT 4000,
  created_at timestamptz DEFAULT now(),
  UNIQUE(period_start)
);

ALTER TABLE public.message_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage message_usage"
  ON public.message_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_current_message_period()
RETURNS TABLE(period_start date, period_end date, messages_sent integer, max_messages integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p_start date;
  p_end date;
BEGIN
  IF EXTRACT(DAY FROM CURRENT_DATE) >= 15 THEN
    p_start := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
    p_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '14 days')::date;
  ELSE
    p_start := (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '14 days')::date;
    p_end := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
  END IF;

  INSERT INTO message_usage (period_start, period_end)
  VALUES (p_start, p_end)
  ON CONFLICT (period_start) DO NOTHING;

  RETURN QUERY SELECT mu.period_start, mu.period_end, mu.messages_sent, mu.max_messages
  FROM message_usage mu WHERE mu.period_start = p_start;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_message_count(count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_start date;
BEGIN
  IF EXTRACT(DAY FROM CURRENT_DATE) >= 15 THEN
    p_start := (date_trunc('month', CURRENT_DATE) + interval '14 days')::date;
  ELSE
    p_start := (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '14 days')::date;
  END IF;
  UPDATE message_usage SET messages_sent = messages_sent + count WHERE period_start = p_start;
END;
$$;
