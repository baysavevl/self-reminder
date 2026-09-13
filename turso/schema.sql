pragma foreign_keys = on;
create table if not exists users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  created_at text not null default (datetime('now')),
  session_version integer not null default 1
);
create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default (datetime('now'))
);
create index if not exists sessions_expiry_idx on sessions(expires_at);
create table if not exists reminders (
  id text primary key,
  owner_id text not null references users(id) on delete cascade,
  type text not null check(type in ('personal','birthday','food')),
  title text not null check(length(trim(title)) between 1 and 200),
  notes text not null default '',
  starts_at text not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  recurrence_kind text not null default 'none' check(recurrence_kind in ('none','daily','weekly','monthly','yearly')),
  recurrence_interval integer not null default 1,
  next_occurrence_at text,
  status text not null default 'active' check(status in ('active','completed','cancelled')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists reminders_owner_next_idx on reminders(owner_id,status,next_occurrence_at);
