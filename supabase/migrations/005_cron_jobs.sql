-- Migration: 005_cron_jobs.sql
-- Purpose: Enable pg_cron and pg_net extensions and schedule the US food waste telemetry crawler to run every 10 minutes.

-- Enable pg_cron and pg_net extensions in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule existing job if it already exists to prevent duplicate entries
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'refresh-us-foodwaste-every-10-min';

-- Schedule the telemetry refresh to execute every 10 minutes
SELECT cron.schedule(
  'refresh-us-foodwaste-every-10-min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://blzsyikioefpnigzagxn.supabase.co/functions/v1/api-v1-us-foodwaste',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_DnL6t56ttULJt9E9ygo7Wg_rs5c9BL2"}'::jsonb,
    body := '{"refresh": true}'::jsonb
  );
  $$
);
