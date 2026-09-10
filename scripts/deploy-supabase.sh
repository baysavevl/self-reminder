#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?Run: supabase login (or export SUPABASE_ACCESS_TOKEN)}"
: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF to your project ref}"
: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN before deploying}"

npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push
npx supabase functions deploy telegram-webhook --no-verify-jwt
npx supabase functions deploy dispatcher --no-verify-jwt
npx supabase secrets set TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
echo "Database and Edge Functions deployed. Configure the Telegram webhook to the telegram-webhook function URL."
