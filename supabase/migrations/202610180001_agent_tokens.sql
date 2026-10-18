create table if not exists public.agent_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'agent',
  scope text not null default 'read' check (scope in ('read', 'write')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists agent_tokens_lookup_idx on public.agent_tokens(token_hash) where revoked_at is null;
alter table public.agent_tokens enable row level security;
create policy agent_tokens_owner_all on public.agent_tokens for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
