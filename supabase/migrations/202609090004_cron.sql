create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Configure the project URL and service key in Supabase Vault before enabling in production.
-- select cron.schedule('self-reminder-dispatcher', '* * * * *', $$select net.http_post(url := current_setting('app.dispatcher_url'), headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.dispatcher_key')), body := '{}'::jsonb);$$);
