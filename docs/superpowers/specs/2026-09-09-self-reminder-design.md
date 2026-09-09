# Self Reminder Design

## 1. Purpose

Self Reminder is a private, single-owner web application and Telegram bot for
creating and receiving personal reminders. It covers three reminder domains:

- Personal appointments and tasks.
- Friends' birthdays.
- Food expiry dates.

The owner can create, view, edit, complete, snooze, and delete reminders from
either the web app or Telegram. A reminder can contain up to five images. The
first release uses structured Telegram commands and button-driven wizards; it
does not use an LLM, OCR, barcode scanning, or paid infrastructure.

## 2. Product Scope

### 2.1 Single-owner access

- The application has one owner account.
- Public sign-up is disabled.
- The owner signs in to the web app with email and password through Supabase
  Auth.
- Telegram updates are accepted only from the configured owner Telegram user
  and the private `Self Reminder` group.
- The Telegram bot is `@self_reminder_vincent_bot`.
- Secrets, including the bot token and Supabase service-role key, are stored
  only as deployment secrets and are never committed.

### 2.2 Reminder types

All reminder types share a title, notes, status, notification rules, images,
and audit timestamps. Domain-specific fields are stored separately.

#### Personal

- One-time or recurring date and time.
- Recurrence supports daily, weekly, monthly, and yearly intervals.
- An optional recurrence end date is supported.
- Completion can apply to the current occurrence or the entire series.
- Snoozing creates a one-time notification without shifting the base series.

#### Birthday

- Person name, relationship, birth date, and optional birth year.
- Recurs yearly.
- When the year is known, the notification shows the upcoming age.
- Default alerts are 14 days, 7 days, 1 day, and 0 days before the birthday.
- The owner can mark gift preparation as complete for the current year.

#### Food expiry

- Item name, quantity, storage location, purchase date, and expiry date.
- Storage location is fridge, freezer, shelf, or a custom value.
- Status is active, consumed, or discarded.
- Default alerts are 7 days, 3 days, 1 day, and 0 days before expiry.
- Consuming or discarding an item cancels its pending notifications.

### 2.3 Images

- Each reminder accepts zero to five JPEG, PNG, or WebP images.
- The web app resizes and compresses images before upload, targeting a maximum
  dimension of 1,920 pixels and a maximum encoded size of 1 MiB per image.
- Images are stored in a private Supabase Storage bucket.
- The database stores object path, media type, byte size, dimensions, display
  order, and an optional Telegram `file_id`.
- Images received from Telegram are downloaded by an Edge Function and copied
  into Supabase Storage so that the web app does not depend on Telegram URLs.
- Images uploaded on the web are sent to Telegram by a short-lived signed URL.
  The returned Telegram `file_id` is saved and reused for later notifications.
- Deleting an image removes the database record immediately and queues its
  Storage object for deletion. Cleanup is retryable and idempotent.

## 3. User Experience

### 3.1 Web app

The mobile-first PWA contains these routes:

- `/login`: owner email and password.
- `/`: dashboard with overdue, today, upcoming birthdays, and expiring food.
- `/calendar`: month calendar plus list view.
- `/reminders/new`: type chooser and reminder form.
- `/reminders/:id`: detail, image gallery, edit, snooze, complete, and delete.
- `/settings`: timezone, Telegram connection status, default alert offsets,
  session status, delivery health, and sign-out.

All destructive actions require a confirmation dialog. Forms preserve an
unsaved local draft if navigation is interrupted.

### 3.2 Telegram commands

The bot exposes Vietnamese commands through BotFather's command menu:

- `/start` — show status and main menu.
- `/add` — create a personal reminder.
- `/birthday` — create a birthday reminder.
- `/food` — create a food-expiry reminder.
- `/list` — browse upcoming reminders.
- `/edit` — select and edit a reminder.
- `/delete` — select and confirm deletion.
- `/cancel` — abandon the current wizard without changing saved data.
- `/help` — show concise usage instructions.

Creation and editing use an inline/reply-keyboard wizard. Wizard state is
stored in the database, expires after 30 minutes of inactivity, and is scoped
to the owner, group, and bot. Images can arrive individually or as a Telegram
media group. The owner presses `Xong` to finish image collection; this avoids
depending on arrival timing between media-group updates.

Reminder notifications include applicable actions:

- `Hoàn thành` or `Đã dùng`.
- `Nhắc lại 10 phút`, `1 giờ`, or `Ngày mai`.
- `Sửa`.
- `Mở trên web`.

Callback payloads contain an opaque short identifier rather than trusting
owner-supplied record IDs. Every callback revalidates the Telegram owner and
target chat.

## 4. Architecture

### 4.1 Components

- **Web PWA:** React, TypeScript, Vite, React Router, and a small query/cache
  layer. It is deployed as static assets on Cloudflare Pages.
- **Backend:** Supabase Postgres, Auth, Storage, Row Level Security, database
  functions, and migrations.
- **Telegram webhook:** a Supabase Edge Function validates Telegram's webhook
  secret, authorizes the sender/chat, advances wizard state, stores incoming
  images, and applies commands and callbacks.
- **Dispatcher:** a Supabase Edge Function claims due delivery rows and sends
  Telegram messages or media groups.
- **Scheduler:** `pg_cron` runs once per minute and invokes the dispatcher via
  `pg_net`. One cron trigger serves every reminder; there is no cron job per
  reminder.
- **Cleanup:** a scheduled Edge Function retries deletion of orphaned Storage
  objects and expires abandoned Telegram drafts.

The implementation is written in the current repository. The MIT-licensed
OpenMemo repository is used as a reference for Supabase migrations, Telegram
webhooks, recurrence, and scheduling, but its LLM, vector search, notes, news,
weather, and read-only calendar modules are not imported as product features.

### 4.2 Data model

#### `profiles`

- `id uuid primary key references auth.users`
- `timezone text not null default 'Asia/Ho_Chi_Minh'`
- `telegram_user_id bigint unique`
- `telegram_group_id bigint unique`
- default alert-offset arrays for each reminder type

#### `reminders`

- `id uuid primary key`
- `owner_id uuid not null`
- `type personal | birthday | food`
- `title text`, `notes text`
- `starts_at timestamptz`
- `timezone text`
- `status active | completed | cancelled`
- `recurrence_kind none | daily | weekly | monthly | yearly`
- `recurrence_interval integer >= 1`
- `recurrence_weekdays smallint[]`
- `recurrence_ends_at timestamptz nullable`
- `next_occurrence_at timestamptz nullable`
- `schedule_version integer not null default 1`
- `source web | telegram`
- audit timestamps

#### `birthday_details`

- `reminder_id uuid primary key`
- `person_name text`
- `relationship text nullable`
- `birth_month smallint`, `birth_day smallint`
- `birth_year smallint nullable`
- `gift_prepared_year smallint nullable`

#### `food_details`

- `reminder_id uuid primary key`
- `quantity text nullable`
- `storage_kind fridge | freezer | shelf | custom`
- `storage_label text nullable`
- `purchased_on date nullable`
- `expires_on date`
- `disposition active | consumed | discarded`

#### `notification_rules`

- `id uuid primary key`
- `reminder_id uuid not null`
- `offset_minutes integer not null`
- unique `(reminder_id, offset_minutes)`

#### `reminder_images`

- `id uuid primary key`
- `reminder_id uuid not null`
- `storage_path text unique`
- metadata fields and `position smallint check (position between 0 and 4)`
- `telegram_file_id text nullable`
- unique `(reminder_id, position)`

#### `notification_deliveries`

- `id uuid primary key`
- `reminder_id uuid not null`
- `occurrence_at timestamptz not null`
- `rule_id uuid nullable`
- `schedule_version integer not null`
- `due_at timestamptz not null`
- `status pending | claimed | sent | retry | failed | cancelled`
- `attempt_count integer`, `next_attempt_at timestamptz`
- `telegram_message_id bigint nullable`, `last_error text nullable`
- a unique idempotency key over reminder, occurrence, rule, and version

#### `telegram_drafts`

- owner/chat-scoped wizard state and step
- partial payload stored as validated JSON
- expiry timestamp and optimistic version

#### `storage_cleanup_jobs`

- object path, attempt count, next-attempt timestamp, and status

### 4.3 Row Level Security

- Public/anonymous access is denied to every application table and the image
  bucket.
- Authenticated policies require `owner_id = auth.uid()`.
- The sole owner account is created manually; application sign-up UI and public
  sign-up are disabled.
- Edge Functions use the service-role key only after validating the Telegram
  webhook secret and configured Telegram identity.
- The web client never receives the service-role key or bot token.

## 5. Session Behaviour

- Supabase access tokens keep their normal short lifetime and are refreshed by
  the Supabase client.
- The web app maintains a three-day sliding activity deadline. On a valid app
  visit, the deadline becomes `now + 3 days`.
- Activity renewal is throttled to at most once per hour to avoid unnecessary
  writes.
- If the deadline has passed, the client signs out before loading private data
  and returns to `/login`.
- Password sign-in, explicit sign-out, password change, or invalid refresh
  token resets the activity state.
- This is an application-level convenience timeout for the single-owner MVP;
  Supabase remains the authority for token validity and Row Level Security.

## 6. Scheduling and Recurrence

- All instants are stored in UTC. Calendar calculations use the reminder's
  IANA timezone, initially `Asia/Ho_Chi_Minh`.
- Creating or editing a reminder validates the recurrence rule, increments
  `schedule_version`, cancels obsolete pending deliveries, calculates the next
  occurrence, and materializes its alert deliveries.
- Daily recurrence preserves local wall-clock time across timezone changes.
- Weekly recurrence supports one or more weekdays.
- Monthly recurrence on days absent from a month uses the month's last day.
- Yearly recurrence on February 29 uses February 28 in non-leap years.
- After the final delivery for an occurrence is processed, the next occurrence
  and its deliveries are created atomically.
- The dispatcher claims rows with a lease so concurrent invocations cannot send
  the same delivery. A unique idempotency key provides a second guard.
- A failed Telegram request retries after 1, 5, and 15 minutes. Rate-limit
  responses honor Telegram's `retry_after`. Permanent failures are displayed
  in Settings and remain available for manual retry.

## 7. Error Handling

- Web forms show field-level validation and retain user input after recoverable
  errors.
- Uploads reject unsupported MIME types, more than five images, or files that
  remain larger than 1 MiB after compression.
- Partial multi-image upload failure keeps successful images and clearly lists
  failed images for retry.
- Telegram wizards respond safely to expired state, duplicate updates, invalid
  callbacks, and edits of deleted reminders.
- Telegram `update_id` values are recorded uniquely so webhook retries are
  idempotent.
- Edge Functions log structured event IDs without logging tokens, signed URLs,
  image bytes, passwords, or private note content.

## 8. Testing and Verification

- Unit tests cover recurrence boundaries, timezone conversion, notification
  offsets, session activity calculations, Telegram command parsing, callback
  validation, and image constraints.
- Database tests cover migrations, RLS owner isolation, schedule-version
  invalidation, atomic delivery claims, and idempotency constraints.
- Edge Function integration tests use a fake Telegram API and local Supabase.
- Web component tests cover authentication, forms for all three reminder types,
  five-image ordering/removal, and destructive-action confirmations.
- End-to-end tests cover web creation to Telegram delivery, Telegram creation
  to web display, edit synchronization in both directions, snooze, recurrence,
  and food completion cancelling pending alerts.
- Deployment verification includes a real private-group smoke test without
  exposing the bot token in logs or screenshots.

## 9. Deployment

- Cloudflare Pages hosts the static PWA on its free tier.
- Supabase Free supplies Postgres, Auth, Storage, Edge Functions, `pg_cron`, and
  `pg_net` within published free quotas.
- Required deployment secrets are the Supabase URL and keys, Telegram bot
  token, Telegram webhook secret, owner Telegram user ID, group ID, and web app
  URL.
- The project provides repeatable migrations, Edge Function deployment scripts,
  webhook registration, BotFather command configuration instructions, and a
  post-deploy smoke-test script.

## 10. Explicitly Deferred

- Multiple application users or shared household accounts.
- Natural-language parsing or any paid/free LLM integration.
- OCR, barcode scanning, recipe suggestions, and shopping lists.
- Google/Apple calendar sync and import/export beyond a later backup feature.
- Notification channels other than Telegram.
- Native iOS or Android applications.

## 11. Acceptance Criteria

- The owner can sign in with email/password from any modern mobile or desktop
  browser and remains signed in while returning at least once every three days.
- The owner can create, edit, and delete all three reminder types from either
  the web app or Telegram and observe the same state on both surfaces.
- Daily, weekly, monthly, and yearly personal recurrence behaves according to
  the rules in this document.
- A reminder stores, orders, displays, and sends up to five images regardless
  of whether those images originated on the web or Telegram.
- Birthday and food reminders receive their default alert schedules and support
  their domain-specific completion actions.
- A due notification is not sent twice when cron or webhook delivery is
  repeated.
- The deployed MVP operates without an LLM and without exceeding the selected
  platforms' free-tier requirements under personal usage.
