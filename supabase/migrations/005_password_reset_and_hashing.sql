-- Migration 005: bcrypt password hashes and forgot-password OTP flow
alter table users add column if not exists password_hash text;
alter table users alter column password drop not null;

create table if not exists password_reset_otp (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  otp text not null,
  attempt_count int default 0,
  next_allowed_at timestamp,
  expires_at timestamp not null,
  used boolean default false,
  reset_token uuid,
  reset_token_expires_at timestamp,
  created_at timestamp default now()
);

create index if not exists password_reset_otp_email_idx on password_reset_otp(email);
create index if not exists password_reset_otp_reset_token_idx on password_reset_otp(reset_token);
