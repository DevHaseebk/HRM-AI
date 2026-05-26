-- Add attendance enhancement columns
alter table attendance add column if not exists check_in_time timestamp;
alter table attendance add column if not exists check_out_time timestamp;
alter table attendance add column if not exists marked_by text default 'self';
alter table attendance add column if not exists qr_token text;
