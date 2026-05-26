-- HRFlow initial schema
-- Run this in Supabase Dashboard → SQL Editor

-- Users/Auth table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null,
  role text check (role in ('super_admin', 'hr_manager', 'team_lead', 'employee')),
  is_temp_password boolean default false,
  must_change_password boolean default false,
  created_at timestamp default now()
);

-- Employees table
create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  full_name text not null,
  cnic text unique,
  phone text,
  email text unique not null,
  department text,
  designation text,
  joining_date date,
  salary numeric,
  status text default 'active',
  created_at timestamp default now()
);

-- Departments table
create table if not exists departments (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  head_id uuid references employees(id),
  created_at timestamp default now()
);

-- Attendance table
create table if not exists attendance (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id),
  date date not null,
  check_in time,
  check_out time,
  check_in_time timestamp,
  check_out_time timestamp,
  marked_by text default 'self',
  qr_token text,
  status text check (status in ('present', 'absent', 'late', 'half_day', 'wfh')),
  created_at timestamp default now()
);

-- Leaves table
create table if not exists leaves (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id),
  leave_type text check (leave_type in ('annual', 'sick', 'casual', 'wfh')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references employees(id),
  created_at timestamp default now()
);

-- Payroll table
create table if not exists payroll (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id),
  month int,
  year int,
  basic_salary numeric,
  deductions numeric default 0,
  bonuses numeric default 0,
  net_salary numeric,
  status text default 'pending' check (status in ('pending', 'paid')),
  created_at timestamp default now()
);

-- Jobs table
create table if not exists jobs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  department text,
  description text,
  requirements text,
  status text default 'open' check (status in ('open', 'closed', 'on_hold')),
  created_at timestamp default now()
);

-- Applicants table
create table if not exists applicants (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references jobs(id),
  full_name text not null,
  email text,
  phone text,
  cv_url text,
  stage text default 'applied' check (stage in ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  notes text,
  created_at timestamp default now()
);

-- Performance table
create table if not exists performance (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id),
  reviewer_id uuid references employees(id),
  period text,
  rating int check (rating between 1 and 5),
  goals text,
  feedback text,
  created_at timestamp default now()
);

-- Announcements table
create table if not exists announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  created_by uuid references employees(id),
  department text default 'all',
  created_at timestamp default now()
);

-- AI chat history (per user)
create table if not exists ai_chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  role text check (role in ('user', 'model')),
  message text not null,
  created_at timestamp default now()
);

create index if not exists ai_chat_history_user_id_idx on ai_chat_history(user_id);
create index if not exists ai_chat_history_created_at_idx on ai_chat_history(created_at);

-- Seed default users (skip if already exist)
insert into users (email, password, role) values
('super@hr.com', 'pass123', 'super_admin'),
('hr@hr.com', 'pass123', 'hr_manager'),
('lead@hr.com', 'pass123', 'team_lead'),
('emp@hr.com', 'pass123', 'employee')
on conflict (email) do nothing;
