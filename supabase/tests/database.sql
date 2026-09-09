begin;
select plan(11);

select has_table('public', 'reminders');
select has_table('public', 'reminder_images');
select has_table('public', 'notification_deliveries');
select has_function('public', 'claim_due_deliveries', array['integer']);
select has_function('public', 'dashboard_summary');
select has_function('public', 'touch_owner_activity');
select policies_are('public', 'reminders', array[
  'reminders_owner_select', 'reminders_owner_insert',
  'reminders_owner_update', 'reminders_owner_delete'
]);
select policies_are('storage', 'objects', array[
  'reminder_images_owner_select', 'reminder_images_owner_insert',
  'reminder_images_owner_delete'
]);
select has_index('public', 'notification_deliveries', 'notification_deliveries_idempotency_key_key');
select has_index('public', 'reminders', 'reminders_owner_next_occurrence_idx');
select has_index('public', 'telegram_updates', 'telegram_updates_update_id_key');
select * from finish();
rollback;
