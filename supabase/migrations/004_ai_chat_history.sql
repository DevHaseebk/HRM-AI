-- Migration 004: AI chat history
create table if not exists ai_chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  role text check (role in ('user', 'model')),
  message text not null,
  created_at timestamp default now()
);

create index if not exists ai_chat_history_user_id_idx on ai_chat_history(user_id);
create index if not exists ai_chat_history_created_at_idx on ai_chat_history(created_at);
