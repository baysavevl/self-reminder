# Self Reminder MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a private, single-owner reminder PWA and Telegram bot for personal appointments, birthdays, food expiry, recurrence, and up to five images per reminder.

**Architecture:** A React/Vite PWA talks to Supabase through authenticated Row Level Security policies. Supabase Postgres stores reminder state, private Storage holds images, Edge Functions receive Telegram updates and dispatch due notifications, and `pg_cron` invokes the dispatcher once per minute. Domain calculations remain in framework-independent TypeScript modules so web and Edge Functions share validated behaviour.

**Tech Stack:** React 19, TypeScript, Vite, React Router, TanStack Query, Supabase JS, Zod, date-fns, rrule, Vitest, Testing Library, Supabase Postgres/Auth/Storage/Edge Functions, Deno, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-09-self-reminder-design.md`

## Global Constraints

- The application is single-owner and public sign-up is disabled.
- The Telegram bot is `@self_reminder_vincent_bot`; tokens and service-role keys never enter Git.
- The default timezone is exactly `Asia/Ho_Chi_Minh`; stored instants use UTC.
- Each reminder accepts at most five JPEG, PNG, or WebP images, each at most 1 MiB after client compression.
- Personal recurrence supports none, daily, weekly, monthly, and yearly.
- Birthday default alerts are 14, 7, 1, and 0 days before; food default alerts are 7, 3, 1, and 0 days before.
- The web session uses a three-day sliding activity deadline renewed at most once per hour.
- Telegram commands and button wizards are Vietnamese and do not call an LLM.
- All application tables and the `reminder-images` bucket enforce owner-only access with RLS.
- Every cron/webhook operation is retry-safe and prevents duplicate Telegram sends.

---

## File Map

- `package.json`: workspace scripts and browser dependencies.
- `src/domain/*`: pure reminder, recurrence, alert, image, and session rules.
- `src/lib/supabase.ts`: browser Supabase client.
- `src/lib/reminders.ts`: typed CRUD and Storage operations used by screens.
- `src/auth/*`: password login, owner session, and protected-route boundary.
- `src/features/dashboard/*`: dashboard summaries.
- `src/features/reminders/*`: create/edit/detail forms and image manager.
- `src/features/calendar/*`: month and list calendar presentation.
- `src/features/settings/*`: delivery health, Telegram status, and sign-out.
- `src/styles.css`: mobile-first visual system and responsive layout.
- `supabase/migrations/*`: schema, RLS, scheduling, and cron SQL.
- `supabase/functions/_shared/*`: Telegram client, authorization, validation, recurrence, and response helpers.
- `supabase/functions/telegram-webhook/index.ts`: commands, callbacks, and wizard transitions.
- `supabase/functions/dispatch-reminders/index.ts`: claim, render, send, retry, and advance deliveries.
- `supabase/functions/cleanup-storage/index.ts`: orphan image and expired draft cleanup.
- `scripts/configure-telegram.ts`: webhook and BotFather command configuration.
- `scripts/smoke-test.ts`: deployment health checks without printing secrets.

---

### Task 1: Establish the typed domain core and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/domain/types.ts`
- Create: `src/domain/recurrence.ts`
- Create: `src/domain/notifications.ts`
- Create: `src/domain/session.ts`
- Create: `src/domain/images.ts`
- Test: `src/domain/recurrence.test.ts`
- Test: `src/domain/notifications.test.ts`
- Test: `src/domain/session.test.ts`
- Test: `src/domain/images.test.ts`

**Interfaces:**
- Produces: `Reminder`, `ReminderInput`, `nextOccurrence()`, `defaultOffsets()`, `touchSlidingSession()`, and `validateImageFiles()`.
- Consumes: no application code.

- [ ] **Step 1: Create the package and TypeScript configuration**

Use scripts `dev`, `build`, `test`, `test:run`, `typecheck`, and `lint`. Runtime dependencies are React, React Router, TanStack Query, Supabase JS, Zod, date-fns, rrule, and browser-image-compression. Test dependencies are Vite, Vitest, jsdom, Testing Library, TypeScript, ESLint, and the React Vite plugin.

- [ ] **Step 2: Write failing recurrence tests**

```ts
expect(nextOccurrence(monthly31, new Date('2026-01-31T02:00:00Z')))
  .toEqual(new Date('2026-02-28T02:00:00Z'))
expect(nextOccurrence(leapBirthday, new Date('2028-02-29T02:00:00Z')))
  .toEqual(new Date('2029-02-28T02:00:00Z'))
expect(nextOccurrence(weeklyMondayWednesday, monday))
  .toEqual(wednesday)
```

- [ ] **Step 3: Run the recurrence test and verify failure**

Run: `npm install && npm run test:run -- src/domain/recurrence.test.ts`

Expected: failure because `nextOccurrence` is not implemented.

- [ ] **Step 4: Implement typed reminder and recurrence rules**

```ts
export type ReminderType = 'personal' | 'birthday' | 'food'
export type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurrenceRule {
  kind: RecurrenceKind
  interval: number
  weekdays: number[]
  endsAt: string | null
  timezone: string
}

export function nextOccurrence(
  rule: RecurrenceRule,
  currentOccurrence: Date,
): Date | null
```

Use calendar-aware date arithmetic. Clamp invalid monthly dates to the final day of the target month and map February 29 yearly recurrence to February 28 in non-leap years.

- [ ] **Step 5: Write failing notification, image, and session tests**

```ts
expect(defaultOffsets('birthday')).toEqual([20160, 10080, 1440, 0])
expect(defaultOffsets('food')).toEqual([10080, 4320, 1440, 0])
expect(touchSlidingSession(now, null).expiresAt).toBe(nowPlusThreeDays)
expect(touchSlidingSession(nowPlusThirtyMinutes, previous).shouldPersist).toBe(false)
expect(() => validateImageFiles(sixImages)).toThrow('Tối đa 5 ảnh')
```

- [ ] **Step 6: Implement notification, image, and sliding-session rules**

`touchSlidingSession` returns `{ expiresAt: string; shouldPersist: boolean }`, renews by exactly three days, and persists only when the previous write is at least one hour old. `validateImageFiles` accepts `image/jpeg`, `image/png`, and `image/webp`, rejects more than five items, and reports any item larger than 1 MiB.

- [ ] **Step 7: Run domain verification**

Run: `npm run test:run && npm run typecheck`

Expected: all domain tests pass and TypeScript reports no errors.

- [ ] **Step 8: Commit the domain core**

```bash
git add package.json package-lock.json tsconfig*.json vite.config.ts vitest.setup.ts src/domain
git commit -m "feat: add reminder domain core"
```

---

### Task 2: Create the Supabase schema, RLS, Storage, and scheduling API

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202609090001_initial_schema.sql`
- Create: `supabase/migrations/202609090002_rls_and_storage.sql`
- Create: `supabase/migrations/202609090003_scheduling.sql`
- Create: `supabase/tests/database.sql`
- Create: `.env.example`

**Interfaces:**
- Produces: tables listed in the spec; RPCs `upsert_reminder`, `complete_reminder`, `snooze_reminder`, `claim_due_deliveries`, `finish_delivery`, `fail_delivery`, `touch_owner_activity`, and `dashboard_summary`.
- Consumes: domain enum values from Task 1.

- [ ] **Step 1: Write the database assertions first**

The SQL test must assert:

```sql
select has_table('public', 'reminders');
select has_table('public', 'reminder_images');
select has_function('public', 'claim_due_deliveries', array['integer']);
select policies_are('public', 'reminders', array['owner_select', 'owner_insert', 'owner_update', 'owner_delete']);
```

It must also create two test users and prove one user's JWT cannot select, mutate, or access Storage objects owned by the other.

- [ ] **Step 2: Run the database test and verify failure**

Run: `npx supabase start && npx supabase test db`

Expected: assertions fail because the tables and functions do not exist.

- [ ] **Step 3: Implement schema and constraints**

Create SQL enums and all tables in the spec. Add foreign keys with deliberate delete behaviour, `updated_at` triggers, five-image position constraints, unique Telegram `update_id`, delivery idempotency, and indexes on:

```sql
reminders(owner_id, status, next_occurrence_at);
notification_deliveries(status, next_attempt_at, due_at);
telegram_drafts(owner_id, chat_id, expires_at);
storage_cleanup_jobs(status, next_attempt_at);
```

- [ ] **Step 4: Implement RLS and private Storage policies**

Create bucket `reminder-images` with `public = false`. Policies compare the first Storage path segment to `auth.uid()::text`. Every application table enables and forces RLS; all policies require `owner_id = auth.uid()` directly or through the parent reminder.

- [ ] **Step 5: Implement transactional reminder RPCs**

`upsert_reminder(jsonb)` validates type-specific payloads, increments `schedule_version`, replaces notification rules, cancels obsolete pending deliveries, computes `next_occurrence_at`, and inserts delivery rows in one transaction. `claim_due_deliveries(limit integer)` uses `for update skip locked` and a five-minute lease.

- [ ] **Step 6: Implement dashboard and session RPCs**

`touch_owner_activity()` upserts the current user's activity deadline to `now() + interval '3 days'` only when the last persistence is at least one hour old. `dashboard_summary()` returns overdue, today, upcoming birthday, expiring food, and failed delivery counts.

- [ ] **Step 7: Run local database verification**

Run: `npx supabase db reset && npx supabase test db`

Expected: migrations complete and every pgTAP assertion passes.

- [ ] **Step 8: Commit the backend schema**

```bash
git add supabase .env.example
git commit -m "feat: add secure reminder database"
```

---

### Task 3: Build the PWA shell and three-day owner authentication

**Files:**
- Create: `index.html`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon.svg`
- Create: `src/main.tsx`
- Create: `src/app.tsx`
- Create: `src/lib/supabase.ts`
- Create: `src/auth/auth-provider.tsx`
- Create: `src/auth/protected-route.tsx`
- Create: `src/auth/login-page.tsx`
- Create: `src/components/app-shell.tsx`
- Create: `src/components/loading-state.tsx`
- Create: `src/styles.css`
- Test: `src/auth/auth-provider.test.tsx`
- Test: `src/auth/login-page.test.tsx`

**Interfaces:**
- Produces: `useAuth(): { user, loading, signIn, signOut }` and protected application routes.
- Consumes: `touchSlidingSession()` from Task 1 and `touch_owner_activity()` from Task 2.

- [ ] **Step 1: Write failing authentication tests**

Test invalid password messaging, redirect after successful sign-in, automatic sign-out after three inactive days, activity renewal on a valid return, and public access denial for protected routes.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:run -- src/auth`

Expected: failure because auth components do not exist.

- [ ] **Step 3: Implement the Supabase browser client and auth provider**

Use `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: true`. On boot, validate the Supabase session, compare local activity expiry, call `touch_owner_activity()` when required, and sign out before loading private data when expired.

- [ ] **Step 4: Implement password login and protected routing**

The login page contains only email, password, submit, pending state, and safe Vietnamese error text. It does not expose sign-up, reset, magic-link, OAuth, or service keys.

- [ ] **Step 5: Implement the responsive PWA shell**

Create bottom navigation on mobile and a left rail on wider screens for Dashboard, Calendar, Add, and Settings. Use semantic landmarks, visible focus styles, a warm neutral palette, and status colours that do not rely on colour alone.

- [ ] **Step 6: Verify auth and production build**

Run: `npm run test:run -- src/auth && npm run typecheck && npm run build`

Expected: tests pass and Vite emits the production bundle.

- [ ] **Step 7: Commit the authenticated shell**

```bash
git add index.html public src package.json package-lock.json
git commit -m "feat: add owner authenticated pwa shell"
```

---

### Task 4: Implement reminder CRUD, dashboard, and type-specific forms

**Files:**
- Create: `src/lib/reminders.ts`
- Create: `src/features/dashboard/dashboard-page.tsx`
- Create: `src/features/reminders/reminder-list.tsx`
- Create: `src/features/reminders/reminder-form.tsx`
- Create: `src/features/reminders/personal-fields.tsx`
- Create: `src/features/reminders/birthday-fields.tsx`
- Create: `src/features/reminders/food-fields.tsx`
- Create: `src/features/reminders/notification-rule-editor.tsx`
- Create: `src/features/reminders/reminder-detail-page.tsx`
- Create: `src/features/reminders/confirm-dialog.tsx`
- Test: `src/features/reminders/reminder-form.test.tsx`
- Test: `src/features/reminders/reminder-detail-page.test.tsx`
- Test: `src/features/dashboard/dashboard-page.test.tsx`

**Interfaces:**
- Produces: `listReminders`, `getReminder`, `saveReminder`, `completeReminder`, `snoozeReminder`, and `deleteReminder`.
- Consumes: Task 1 types, Task 2 RPCs, and Task 3 authentication.

- [ ] **Step 1: Write failing form and CRUD tests**

Test required personal date/time, optional recurrence end, birthday year omission, calculated upcoming age, food expiry before purchase rejection, default offsets, series completion choice, and deletion confirmation.

- [ ] **Step 2: Run feature tests and verify failure**

Run: `npm run test:run -- src/features/reminders src/features/dashboard`

Expected: component and repository imports are missing.

- [ ] **Step 3: Implement typed Supabase repository operations**

Map database snake-case rows to domain objects in one module. All writes call transactional RPCs; no component writes related tables independently. Normalize errors into `{ code, message }` without exposing SQL or service details.

- [ ] **Step 4: Implement the three reminder forms**

Use one shared form shell with explicit type-specific sections. Personal recurrence presents none/daily/weekly/monthly/yearly, interval, weekdays when weekly, and optional end. Birthday and food forms preload their specified default alert offsets.

- [ ] **Step 5: Implement dashboard and reminder detail**

Dashboard cards show overdue, today, birthdays, expiring food, and failed deliveries. Detail actions call RPCs and invalidate only affected TanStack Query keys.

- [ ] **Step 6: Add unsaved-draft and destructive-action protection**

Persist drafts by reminder type in `sessionStorage`; clear them only after successful save or explicit discard. Require a confirmation dialog before delete, series completion, or cancellation.

- [ ] **Step 7: Verify CRUD features**

Run: `npm run test:run -- src/features && npm run typecheck && npm run build`

Expected: all feature tests and build pass.

- [ ] **Step 8: Commit reminder CRUD**

```bash
git add src/features src/lib/reminders.ts
git commit -m "feat: add reminder management flows"
```

---

### Task 5: Add private five-image management and calendar views

**Files:**
- Create: `src/lib/images.ts`
- Create: `src/features/reminders/image-manager.tsx`
- Create: `src/features/reminders/image-gallery.tsx`
- Create: `src/features/calendar/calendar-page.tsx`
- Create: `src/features/calendar/month-grid.tsx`
- Create: `src/features/calendar/calendar-list.tsx`
- Test: `src/features/reminders/image-manager.test.tsx`
- Test: `src/features/calendar/calendar-page.test.tsx`

**Interfaces:**
- Produces: `compressImage`, `uploadReminderImages`, `reorderReminderImages`, `removeReminderImage`, and signed image reads.
- Consumes: Task 1 image validation, Task 2 private bucket policies, and Task 4 reminder repository.

- [ ] **Step 1: Write failing five-image tests**

Test drag/reorder, removing before upload, appending to existing images, six-image rejection, MIME rejection, partial upload retry, and revocation of browser object URLs on unmount.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:run -- src/features/reminders/image-manager.test.tsx`

Expected: image components and functions are missing.

- [ ] **Step 3: Implement compression and private uploads**

Compress in the browser to WebP when supported, maximum 1,920 pixels and 1 MiB. Upload to `${ownerId}/${reminderId}/${imageId}.${extension}`. Insert metadata only after Storage succeeds; on metadata failure, enqueue or immediately attempt Storage rollback.

- [ ] **Step 4: Implement accessible image management**

Support file picker, camera capture on mobile, preview, remove, move earlier/later buttons, upload progress, and retry. Enforce five images across existing and new items.

- [ ] **Step 5: Implement calendar month and list views**

Render personal, birthday, and food occurrences with text labels and icons. Month navigation queries a bounded date window; selecting an item opens its reminder detail route.

- [ ] **Step 6: Verify images, calendar, and build**

Run: `npm run test:run -- src/features/reminders/image-manager.test.tsx src/features/calendar && npm run typecheck && npm run build`

Expected: tests pass with no leaked object URLs.

- [ ] **Step 7: Commit image and calendar features**

```bash
git add src/lib/images.ts src/features/reminders src/features/calendar
git commit -m "feat: add reminder images and calendar"
```

---

### Task 6: Implement the Telegram webhook and Vietnamese wizards

**Files:**
- Create: `supabase/functions/_shared/env.ts`
- Create: `supabase/functions/_shared/telegram.ts`
- Create: `supabase/functions/_shared/telegram-auth.ts`
- Create: `supabase/functions/_shared/wizard.ts`
- Create: `supabase/functions/_shared/reminder-service.ts`
- Create: `supabase/functions/telegram-webhook/index.ts`
- Test: `supabase/functions/tests/telegram-webhook.test.ts`

**Interfaces:**
- Produces: webhook handling for `/start`, `/add`, `/birthday`, `/food`, `/list`, `/edit`, `/delete`, `/cancel`, `/help`, callbacks, and images.
- Consumes: Task 2 RPCs and Storage model; Telegram Bot API through `telegram.ts` only.

- [ ] **Step 1: Write failing webhook tests using a fake Telegram transport**

Cover invalid webhook secret, wrong owner, wrong group, duplicate `update_id`, wizard start/cancel/expiry, personal/birthday/food creation, image collection capped at five, media-group handling, callback tampering, edit, delete confirmation, and list pagination.

- [ ] **Step 2: Run tests and verify failure**

Run: `npx supabase functions serve --env-file supabase/.env.test` in one terminal and `npm run test:run -- supabase/functions/tests/telegram-webhook.test.ts` in another.

Expected: tests fail because the webhook route is absent.

- [ ] **Step 3: Implement the Telegram API boundary**

Expose only typed `sendMessage`, `sendPhoto`, `sendMediaGroup`, `editMessageText`, `answerCallbackQuery`, `getFile`, and `setMyCommands` functions. Inject the API base URL so tests use a local fake. Never log request URLs because they contain the token.

- [ ] **Step 4: Implement authorization and update idempotency**

Validate `x-telegram-bot-api-secret-token` with constant-time comparison, then compare sender and chat IDs with deployment secrets. Insert `update_id` before side effects; return HTTP 200 for already-processed updates.

- [ ] **Step 5: Implement deterministic wizard transitions**

Wizard steps accept and validate one field at a time. Save optimistic version, partial JSON, message IDs, image IDs, and a 30-minute expiry. `/cancel` deletes the draft. `Xong` finalizes images and calls the same reminder RPC as the web app.

- [ ] **Step 6: Implement commands, callbacks, and Telegram-originated images**

Download the largest Telegram photo variant, reject unsupported/oversized files, store it privately, and save the Telegram `file_id`. Callback data uses action plus a short server-issued token stored against the owner and target reminder.

- [ ] **Step 7: Verify the webhook**

Run: `npm run test:run -- supabase/functions/tests/telegram-webhook.test.ts`

Expected: all fake-Telegram webhook scenarios pass without outbound network access.

- [ ] **Step 8: Commit Telegram input flows**

```bash
git add supabase/functions
git commit -m "feat: add telegram reminder wizards"
```

---

### Task 7: Implement delivery dispatch, retry, recurrence advancement, and cleanup

**Files:**
- Create: `supabase/functions/_shared/message-renderer.ts`
- Create: `supabase/functions/dispatch-reminders/index.ts`
- Create: `supabase/functions/cleanup-storage/index.ts`
- Create: `supabase/migrations/202609090004_cron.sql`
- Test: `supabase/functions/tests/dispatch-reminders.test.ts`
- Test: `supabase/functions/tests/cleanup-storage.test.ts`

**Interfaces:**
- Produces: due-delivery dispatch and scheduled cleanup endpoints.
- Consumes: Task 1 recurrence semantics, Task 2 claim/finish/fail RPCs, and Task 6 Telegram transport.

- [ ] **Step 1: Write failing dispatcher tests**

Cover concurrent claims, stale lease recovery, duplicate invocation, text-only delivery, one-photo delivery, five-photo media group, cached `file_id`, signed-URL fallback, `retry_after`, 1/5/15-minute retry delays, permanent failure, and next-occurrence creation.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:run -- supabase/functions/tests/dispatch-reminders.test.ts`

Expected: dispatcher imports are missing.

- [ ] **Step 3: Implement safe message rendering**

Render Vietnamese plain text with title, local date/time, type-specific fields, notes, occurrence information, and action buttons. Do not use Telegram Markdown parsing for user-controlled content.

- [ ] **Step 4: Implement claim-send-finalize dispatch**

Claim at most 50 deliveries, skip stale `schedule_version`, send text/media, persist message IDs and new `file_id` values, finalize the delivery, and atomically materialize the next recurrence when the occurrence is complete.

- [ ] **Step 5: Implement retry and permanent failure handling**

Honor Telegram 429 `retry_after`. For other transient errors schedule 1, 5, then 15 minutes. Mark blocked-chat, invalid-chat, and exhausted attempts as failed and expose them through `dashboard_summary()`.

- [ ] **Step 6: Implement Storage cleanup and draft expiry**

Process a bounded batch of cleanup rows, treat missing objects as success, back off transient failures, and delete Telegram drafts older than 30 minutes.

- [ ] **Step 7: Add cron configuration**

Enable `pg_cron` and `pg_net`. Register one minutely dispatcher call and one daily cleanup call using Vault-held URLs/secrets. The migration must replace jobs by stable names to remain repeatable.

- [ ] **Step 8: Verify scheduling and cleanup**

Run: `npx supabase db reset && npx supabase test db && npm run test:run -- supabase/functions/tests`

Expected: database, dispatch, retry, recurrence, and cleanup tests all pass.

- [ ] **Step 9: Commit outbound delivery**

```bash
git add supabase
git commit -m "feat: add reliable telegram delivery"
```

---

### Task 8: Add Settings, deployment automation, and full-story verification

**Files:**
- Create: `src/features/settings/settings-page.tsx`
- Create: `scripts/configure-telegram.ts`
- Create: `scripts/smoke-test.ts`
- Create: `wrangler.toml`
- Create: `README.md`
- Create: `.github/workflows/ci.yml`
- Create: `tests/e2e/reminder-flow.spec.ts`
- Create: `playwright.config.ts`
- Modify: `package.json`
- Test: `src/features/settings/settings-page.test.tsx`

**Interfaces:**
- Produces: repeatable deployment/configuration and verified end-to-end owner flow.
- Consumes: every prior task.

- [ ] **Step 1: Write failing Settings and end-to-end tests**

Settings must show timezone, linked Telegram IDs, delivery counts, latest failure, manual retry, sliding-session expiry, and sign-out. The browser test creates a personal reminder with five images, edits it, completes one occurrence, creates birthday and food reminders, then verifies all appear in calendar and dashboard.

- [ ] **Step 2: Implement Settings without exposing secrets**

Read only safe profile and delivery-health fields. Manual retry calls an owner-authorized RPC. Display bot username but never token, webhook secret, service-role key, or signed Storage URLs.

- [ ] **Step 3: Implement Telegram configuration script**

Read secrets from process environment, call `setWebhook` with `secret_token`, call `setMyCommands` with the Vietnamese command list, verify `getWebhookInfo`, and print only bot username, webhook host, and success state.

- [ ] **Step 4: Implement Cloudflare Pages configuration and documentation**

Document local Supabase startup, owner creation, environment variables, migration/function deployment, Cloudflare Pages build settings, webhook configuration, group/user ID capture, rollback, and backup/export. Ensure `wrangler.toml` contains no secrets.

- [ ] **Step 5: Add CI**

On pull requests and main pushes, install with `npm ci`, run unit tests, typecheck, production build, start local Supabase, and run database tests. Cache npm data only; never upload `.env` artifacts.

- [ ] **Step 6: Run complete local verification**

Run:

```bash
npm ci
npm run test:run
npm run typecheck
npm run build
npx supabase db reset
npx supabase test db
```

Expected: every command exits zero.

- [ ] **Step 7: Run credentialed deployment smoke test when secrets are supplied**

Run: `npm run configure:telegram && npm run smoke:test`

Expected: webhook points to the deployed Edge Function, the bot identity is correct, the private group is authorized, and one explicitly labeled test reminder arrives once. This step is skipped locally when deployment secrets are absent and is never simulated as success.

- [ ] **Step 8: Commit deployment and verification**

```bash
git add .github README.md wrangler.toml playwright.config.ts scripts src/features/settings tests package.json package-lock.json
git commit -m "feat: complete self reminder mvp"
```

---

## Completion Gate

Before claiming completion:

1. Run every command in Task 8 Step 6 from a clean install.
2. Confirm `git diff --check` is empty.
3. Search tracked files for Telegram-token patterns and service-role secrets.
4. Compare implemented routes, tables, commands, recurrence cases, image rules,
   and session behaviour against the design spec.
5. Report any credential-dependent deployment step as pending unless it was
   actually executed and its result observed.
