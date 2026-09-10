create or replace function public.touch_owner_activity()
returns table(activity_expires_at timestamptz, persisted boolean)
language plpgsql security definer set search_path = public as $$
declare expiry timestamptz := now() + interval '3 days';
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.profiles set activity_expires_at = expiry,
    activity_persisted_at = case when activity_persisted_at is null or activity_persisted_at < now() - interval '1 hour' then now() else activity_persisted_at end
    where id = auth.uid();
  return query select expiry, true;
end;
$$;

create or replace function public.claim_due_deliveries(batch_size integer default 50)
returns setof public.notification_deliveries
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidates as (
    select d.id from public.notification_deliveries d
    where d.status in ('pending','retry') and d.next_attempt_at <= now()
      and (d.lease_until is null or d.lease_until < now())
    order by d.due_at asc limit greatest(batch_size, 1) for update skip locked
  )
  update public.notification_deliveries d set status='claimed', lease_until=now()+interval '5 minutes', attempt_count=attempt_count+1, updated_at=now()
  from candidates c where d.id=c.id returning d.*;
end;
$$;

create or replace function public.finish_delivery(delivery_id uuid, message_id bigint default null)
returns void language sql security definer set search_path = public as $$
  update public.notification_deliveries set status='sent', telegram_message_id=coalesce(message_id, telegram_message_id), lease_until=null, updated_at=now() where id=delivery_id;
$$;

create or replace function public.fail_delivery(delivery_id uuid, error_message text, retry_at timestamptz default null)
returns void language sql security definer set search_path = public as $$
  update public.notification_deliveries set status=case when retry_at is null then 'failed' else 'retry' end, last_error=left(error_message,1000), next_attempt_at=coalesce(retry_at, next_attempt_at), lease_until=null, updated_at=now() where id=delivery_id;
$$;

create or replace function public.dashboard_summary()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('total', count(*), 'active', count(*) filter (where status='active'), 'upcoming', count(*) filter (where status='active' and next_occurrence_at >= now() and next_occurrence_at < now()+interval '7 days')) from public.reminders where owner_id=auth.uid();
$$;

revoke all on function public.claim_due_deliveries(integer) from public, anon, authenticated;
revoke all on function public.finish_delivery(uuid,bigint) from public, anon, authenticated;
revoke all on function public.fail_delivery(uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.touch_owner_activity() to authenticated;
grant execute on function public.dashboard_summary() to authenticated;
