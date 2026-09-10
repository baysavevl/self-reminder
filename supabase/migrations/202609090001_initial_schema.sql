create extension if not exists pgcrypto;

create type public.reminder_type as enum ('personal', 'birthday', 'food');
create type public.reminder_status as enum ('active', 'completed', 'cancelled');
create type public.recurrence_kind as enum ('none', 'daily', 'weekly', 'monthly', 'yearly');
create type public.reminder_source as enum ('web', 'telegram');
create type public.food_disposition as enum ('active', 'consumed', 'discarded');
create type public.delivery_status as enum ('pending', 'claimed', 'sent', 'retry', 'failed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  telegram_user_id bigint unique,
  telegram_group_id bigint unique,
  personal_default_offsets integer[] not null default array[1440, 60, 0],
  birthday_default_offsets integer[] not null default array[20160, 10080, 1440, 0],
  food_default_offsets integer[] not null default array[10080, 4320, 1440, 0],
  activity_expires_at timestamptz,
  activity_persisted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type public.reminder_type not null,
  title text not null check (length(trim(title)) between 1 and 200),
  notes text not null default '',
  starts_at timestamptz not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  status public.reminder_status not null default 'active',
  recurrence_kind public.recurrence_kind not null default 'none',
  recurrence_interval integer not null default 1 check (recurrence_interval > 0),
  recurrence_weekdays smallint[] not null default '{}',
  recurrence_ends_at timestamptz,
  next_occurrence_at timestamptz,
  schedule_version integer not null default 1 check (schedule_version > 0),
  source public.reminder_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.birthday_details (
  reminder_id uuid primary key references public.reminders(id) on delete cascade,
  person_name text not null check (length(trim(person_name)) between 1 and 160),
  relationship text,
  birth_month smallint not null check (birth_month between 1 and 12),
  birth_day smallint not null check (birth_day between 1 and 31),
  birth_year smallint check (birth_year between 1 and 9999),
  gift_prepared_year smallint
);

create table public.food_details (
  reminder_id uuid primary key references public.reminders(id) on delete cascade,
  quantity text,
  storage_kind text not null check (storage_kind in ('fridge', 'freezer', 'shelf', 'custom')),
  storage_label text,
  purchased_on date,
  expires_on date not null,
  disposition public.food_disposition not null default 'active',
  check (purchased_on is null or purchased_on <= expires_on)
);

create table public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  offset_minutes integer not null check (offset_minutes >= 0),
  unique (reminder_id, offset_minutes)
);

create table public.reminder_images (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 1048576),
  width integer,
  height integer,
  position smallint not null check (position between 0 and 4),
  telegram_file_id text,
  created_at timestamptz not null default now(),
  unique (reminder_id, position)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  occurrence_at timestamptz not null,
  rule_id uuid references public.notification_rules(id) on delete set null,
  schedule_version integer not null,
  due_at timestamptz not null,
  status public.delivery_status not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  telegram_message_id bigint,
  last_error text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.telegram_updates (
  update_id bigint primary key,
  chat_id bigint not null,
  received_at timestamptz not null default now()
);

create table public.telegram_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  chat_id bigint not null,
  step text not null,
  payload jsonb not null default '{}',
  version integer not null default 1,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (owner_id, chat_id)
);

create table public.storage_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'retry', 'done', 'failed')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);

create index reminders_owner_next_occurrence_idx on public.reminders(owner_id, status, next_occurrence_at);
create index notification_deliveries_due_idx on public.notification_deliveries(status, next_attempt_at, due_at);
create index telegram_drafts_expiry_idx on public.telegram_drafts(expires_at);
create index storage_cleanup_jobs_due_idx on public.storage_cleanup_jobs(status, next_attempt_at);
