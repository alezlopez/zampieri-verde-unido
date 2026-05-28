CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job antigo se existir
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'resumo-diario-vendas-20h';

-- Agendar diariamente às 23:00 UTC (= 20:00 America/Sao_Paulo)
SELECT cron.schedule(
  'resumo-diario-vendas-20h',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lzdhrtcugqnqmyapgmbs.supabase.co/functions/v1/resumo-diario-vendas',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZGhydGN1Z3FucW15YXBnbWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyOTk1NTUsImV4cCI6MjA1ODg3NTU1NX0.vefEvdZaH7DmCwvHyH2LtSvZ8h4tykbb0yZ4UBVN0CA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);