# Self Reminder

Private reminder PWA for personal appointments, birthdays and food expiry, with Telegram delivery.

## Local setup

```sh
npm install
cp .env.example .env
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`. Keep `TELEGRAM_BOT_TOKEN` and the service-role key only in Supabase Edge Function secrets.

## Supabase deploy

```sh
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push
npx supabase functions deploy telegram-webhook --no-verify-jwt
npx supabase functions deploy dispatcher --no-verify-jwt
npx supabase secrets set TELEGRAM_BOT_TOKEN="..." TELEGRAM_WEBHOOK_SECRET="..."
```

Configure the Telegram webhook to the deployed `telegram-webhook` URL. Enable the dispatcher cron after setting the project URL and service key in Supabase Vault. The bot is owner-only: link the Telegram group to the profile before creating reminders.

## Verification

`npm run typecheck`, `npm run build`, and `npm run test:run` pass locally. Supabase pgTAP verification requires Docker or a hosted Supabase project.
