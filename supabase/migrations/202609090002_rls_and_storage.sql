create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','reminders','notification_deliveries','telegram_drafts'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create or replace function public.is_owner(target_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and auth.uid() = target_owner;
$$;

alter table public.profiles enable row level security;
alter table public.reminders enable row level security;
alter table public.birthday_details enable row level security;
alter table public.food_details enable row level security;
alter table public.notification_rules enable row level security;
alter table public.reminder_images enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.telegram_drafts enable row level security;
alter table public.telegram_updates enable row level security;
alter table public.storage_cleanup_jobs enable row level security;

create policy profiles_owner_select on public.profiles for select using (id = auth.uid());
create policy profiles_owner_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy reminders_owner_select on public.reminders for select using (owner_id = auth.uid());
create policy reminders_owner_insert on public.reminders for insert with check (owner_id = auth.uid());
create policy reminders_owner_update on public.reminders for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy reminders_owner_delete on public.reminders for delete using (owner_id = auth.uid());

create policy birthday_details_owner_all on public.birthday_details for all using (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid()));
create policy food_details_owner_all on public.food_details for all using (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid()));
create policy notification_rules_owner_all on public.notification_rules for all using (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid()));
create policy reminder_images_owner_all on public.reminder_images for all using (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid()));
create policy notification_deliveries_owner_select on public.notification_deliveries for select using (exists (select 1 from public.reminders r where r.id = reminder_id and r.owner_id = auth.uid()));
create policy telegram_drafts_owner_all on public.telegram_drafts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public) values ('reminder-images', 'reminder-images', false) on conflict (id) do update set public = false;
create policy reminder_images_owner_select on storage.objects for select using (bucket_id = 'reminder-images' and public.is_owner((storage.foldername(name))[1]::uuid));
create policy reminder_images_owner_insert on storage.objects for insert with check (bucket_id = 'reminder-images' and public.is_owner((storage.foldername(name))[1]::uuid));
create policy reminder_images_owner_delete on storage.objects for delete using (bucket_id = 'reminder-images' and public.is_owner((storage.foldername(name))[1]::uuid));
