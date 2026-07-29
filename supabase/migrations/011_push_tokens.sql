-- Expo push token registration for the mobile app.
-- Token is globally unique: a device re-registering under a new user
-- (logout -> new login) must reassign user_id via upsert, not duplicate.

create table if not exists user_push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  token text not null unique,
  platform text check (platform in ('ios','android')),
  device_name text,
  last_used_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists user_push_tokens_user_id_idx
  on user_push_tokens(user_id);

NOTIFY pgrst, 'reload schema';
