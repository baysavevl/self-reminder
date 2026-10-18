# Agent API and MCP Integration Design

## Goal

Expose Self Reminder reminders to external agents and automation workflows through a stable REST API and an MCP Streamable HTTP adapter.

## Architecture

The REST API is the canonical contract. Vercel Node.js functions authenticate a bearer API token, validate request payloads, and access Supabase server-side with the service-role key. An MCP adapter exposes the same operations as tools and delegates to the REST API, so REST and MCP never implement different business rules.

## Authentication

Agents use a separate bearer token, not the browser password. Tokens are stored as SHA-256 hashes in Supabase and have explicit `read` or `write` scopes. The raw token is shown only once during creation and is never returned by list endpoints.

## REST resources

- `GET /api/v1/reminders`: list active/completed reminders with optional `type`, `from`, `to`, and `limit` filters.
- `POST /api/v1/reminders`: create a reminder.
- `GET /api/v1/reminders/:id`: retrieve one reminder.
- `PATCH /api/v1/reminders/:id`: update editable fields.
- `POST /api/v1/reminders/:id/complete`: mark a reminder completed.
- `DELETE /api/v1/reminders/:id`: cancel a reminder.
- `POST /api/v1/agent-tokens`: create a token (browser/admin only in the first release).

All timestamps are ISO-8601 strings. Reminder types are `personal`, `birthday`, and `food`. Images remain handled by the webapp upload flow in the first release; the API returns existing image metadata but does not accept arbitrary binary uploads.

## MCP tools

The MCP server exposes `list_reminders`, `get_reminder`, `create_reminder`, `update_reminder`, `complete_reminder`, and `delete_reminder`. Tool input/output schemas are derived from the OpenAPI schemas. The remote endpoint accepts the same bearer token in the `Authorization` header.

## Error contract

Errors are JSON `{ "error": { "code": string, "message": string, "requestId": string } }` with HTTP status 400, 401, 403, 404, or 500. No database error details or secrets are returned.

## Compatibility

The OpenAPI document is committed at `docs/api/openapi.yaml`. It is suitable for importing into n8n, Make, GPT Actions, LangGraph clients, and generated SDK tooling.
