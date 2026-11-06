-- Remove cron job antigo que apontava para função inexistente (limpar-duplicatas)
SELECT cron.unschedule('limpar-duplicatas-diario');

-- Agenda cancelamento automático de ingressos pendentes >2h (Termo de Compra cláusula 3)
SELECT cron.schedule(
  'cancelar-pendentes-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lzdhrtcugqnqmyapgmbs.supabase.co/functions/v1/cancelar-pendentes',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZGhydGN1Z3FucW15YXBnbWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyOTk1NTUsImV4cCI6MjA1ODg3NTU1NX0.vefEvdZaH7DmCwvHyH2LtSvZ8h4tykbb0yZ4UBVN0CA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);