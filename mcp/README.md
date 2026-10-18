# Self Reminder MCP

The MCP endpoint is `/api/mcp`. It uses Streamable HTTP and accepts the same agent token as the REST API:

```text
Authorization: Bearer <one-time token>
```

Required Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `SELF_REMINDER_OWNER_ID`
- `SELF_REMINDER_ADMIN_KEY`
- `SELF_REMINDER_API_URL` (optional; defaults to `https://self-reminder.vercel.app/api/v1`)

Create a token once with:

```bash
curl -X POST https://self-reminder.vercel.app/api/v1/agent-tokens \
  -H "x-admin-key: $SELF_REMINDER_ADMIN_KEY" \
  -H 'content-type: application/json' \
  -d '{"label":"n8n","scope":"write"}'
```

The response contains the raw token exactly once. Store it in the agent's secret manager, not in a prompt or repository.

The MCP tools are `list_reminders`, `get_reminder`, `create_reminder`, `update_reminder`, `complete_reminder`, and `delete_reminder`.
