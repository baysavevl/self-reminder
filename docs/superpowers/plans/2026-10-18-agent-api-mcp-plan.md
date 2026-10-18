# Agent API and MCP Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a versioned REST API, OpenAPI contract, and MCP adapter for agent access to Supabase-backed reminders.

**Architecture:** REST is canonical and runs as Vercel Node.js functions. The MCP adapter calls the REST contract and exposes the same reminder operations as tools.

**Tech Stack:** TypeScript, Vercel Node.js functions, Supabase server client, OpenAPI 3.1, MCP TypeScript SDK.

**Spec:** `docs/superpowers/specs/2026-10-18-agent-api-mcp-design.md`

## Global Constraints

- Never expose the Supabase service-role key to browser or extension code.
- Never return raw agent tokens after creation.
- Every endpoint validates bearer token scope before database access.
- Every timestamp in the API is ISO-8601.
- Images are metadata-only in the first API release.

## Review Focus

- Missing/invalid bearer token returns 401 without querying Supabase.
- Read token cannot mutate reminders and returns 403.
- Invalid type/date/limit returns 400 with the stable error shape.
- A reminder belonging to another owner is indistinguishable from not found (404).
- Database failures return 500 without leaking provider details.

### Task 1: Contract and domain validation

**Files:**
- Create: `src/domain/agentApi.ts`
- Test: `src/domain/agentApi.test.ts`
- Create: `docs/api/openapi.yaml`

- [ ] Write failing tests for bearer parsing, scope checks, reminder payload validation, and stable error envelopes.
- [ ] Implement pure validation helpers and export their types.
- [ ] Add the OpenAPI schemas and paths matching those exported types.
- [ ] Run `npm run test:run -- src/domain/agentApi.test.ts`.

### Task 2: Supabase server API functions

**Files:**
- Create: `api/v1/reminders.ts`
- Create: `api/v1/reminders/[id].ts`
- Create: `api/v1/reminders/[id]/complete.ts`
- Create: `api/v1/agent-tokens.ts`
- Create: `src/server/agentAuth.ts`
- Test: `src/server/agentAuth.test.ts`

- [ ] Add server-only environment checks for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and token secret configuration.
- [ ] Implement SHA-256 token lookup and scope enforcement.
- [ ] Implement list/create/update/complete/delete handlers using owner-scoped Supabase queries.
- [ ] Add token creation with one-time raw token response.
- [ ] Run typecheck and API unit tests.

### Task 3: Database migration and MCP adapter

**Files:**
- Create: `supabase/migrations/202610180001_agent_tokens.sql`
- Create: `mcp/server.ts`
- Create: `mcp/README.md`
- Test: `mcp/server.test.ts`

- [ ] Add `agent_tokens` table with hashed token, scope, owner, timestamps, and revocation fields.
- [ ] Implement MCP tools that call the REST API with the configured bearer token.
- [ ] Verify MCP tool schemas and error propagation.
- [ ] Document Streamable HTTP deployment and environment variables.

### Task 4: Verification and handoff

- [ ] Run all tests, typecheck, and production build.
- [ ] Validate OpenAPI syntax.
- [ ] Add setup instructions for Vercel environment variables and token creation.
- [ ] Commit and push the completed implementation.
