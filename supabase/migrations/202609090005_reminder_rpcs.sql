create or replace function public.upsert_reminder(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid := nullif(payload->>'id','')::uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if rid is null then
    insert into public.reminders(owner_id,type,title,notes,starts_at,timezone,recurrence_kind,recurrence_interval,recurrence_weekdays,recurrence_ends_at,next_occurrence_at,source)
    values(auth.uid(),(payload->>'type')::reminder_type,left(payload->>'title',200),coalesce(payload->>'notes',''),(payload->>'starts_at')::timestamptz,coalesce(payload->>'timezone','Asia/Ho_Chi_Minh'),coalesce((payload->>'recurrence_kind')::recurrence_kind,'none'),coalesce((payload->>'recurrence_interval')::int,1),coalesce(array(select jsonb_array_elements_text(payload->'recurrence_weekdays'))::smallint[],'{}'),nullif(payload->>'recurrence_ends_at','')::timestamptz,(payload->>'starts_at')::timestamptz,'web') returning id into rid;
  else update public.reminders set type=(payload->>'type')::reminder_type,title=left(payload->>'title',200),notes=coalesce(payload->>'notes',''),starts_at=(payload->>'starts_at')::timestamptz,next_occurrence_at=(payload->>'starts_at')::timestamptz,schedule_version=schedule_version+1 where id=rid and owner_id=auth.uid(); end if;
  delete from public.notification_rules where reminder_id=rid;
  insert into public.notification_rules(reminder_id,offset_minutes) select rid, value::int from jsonb_array_elements_text(coalesce(payload->'offsets','[0]'::jsonb));
  return rid;
end; $$;

create or replace function public.complete_reminder(reminder_id uuid) returns void language sql security definer set search_path=public as $$ update public.reminders set status='completed' where id=reminder_id and owner_id=auth.uid(); $$;
create or replace function public.snooze_reminder(reminder_id uuid, snooze_until timestamptz) returns void language sql security definer set search_path=public as $$ update public.reminders set next_occurrence_at=snooze_until,status='active' where id=reminder_id and owner_id=auth.uid(); $$;
grant execute on function public.upsert_reminder(jsonb), public.complete_reminder(uuid), public.snooze_reminder(uuid,timestamptz) to authenticated;
