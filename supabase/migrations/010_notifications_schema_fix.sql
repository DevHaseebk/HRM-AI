-- Migration 010: bring the pre-existing (manually created) `notifications`
-- table fully in line with the schema the notifications backend (Prompt 1)
-- and push notifications (Prompt 2) tasks require.
--
-- The table already existed in this project with columns:
--   id, user_id, title, message, type, read, link, created_at
-- Missing: company_id, category. This migration adds them plus the
-- indexes/constraints the notification queries need. Table was empty
-- (0 rows) at the time of this migration, so constraints are safe to add.

alter table notifications add column if not exists company_id uuid references companies(id);
alter table notifications add column if not exists category text;

-- Tighten existing columns to match spec (safe: table has 0 rows).
alter table notifications alter column user_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_user_id_fkey_cascade'
  ) then
    alter table notifications drop constraint if exists notifications_user_id_fkey;
    alter table notifications add constraint notifications_user_id_fkey_cascade
      foreign key (user_id) references users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_type_check'
  ) then
    alter table notifications add constraint notifications_type_check
      check (type in ('info','success','warning','error'));
  end if;
end $$;

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_user_unread_idx on notifications(user_id, read);
create index if not exists notifications_created_at_idx on notifications(created_at desc);
