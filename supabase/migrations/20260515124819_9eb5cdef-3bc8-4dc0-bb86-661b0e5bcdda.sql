DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cancelar-pendentes-15min') THEN
    PERFORM cron.unschedule('cancelar-pendentes-15min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cancelar-pendentes-5min') THEN
    PERFORM cron.unschedule('cancelar-pendentes-5min');
  END IF;
  PERFORM cron.schedule(
    'cancelar-pendentes-5min',
    '*/5 * * * *',
    $cron$
      SELECT net.http_post(
        url := 'https://lzdhrtcugqnqmyapgmbs.supabase.co/functions/v1/cancelar-pendentes',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZGhydGN1Z3FucW15YXBnbWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyOTk1NTUsImV4cCI6MjA1ODg3NTU1NX0.vefEvdZaH7DmCwvHyH2LtSvZ8h4tykbb0yZ4UBVN0CA"}'::jsonb,
        body := '{}'::jsonb
      );
    $cron$
  );
END $$;