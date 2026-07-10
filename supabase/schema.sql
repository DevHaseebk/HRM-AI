-- HRFlow initial schema
-- Run this in Supabase Dashboard → SQL Editor

-- Users/Auth table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text,
  password_hash text,
  role text check (role in ('super_admin', 'company_admin', 'hr_manager', 'team_lead', 'employee')),
  company_id uuid,
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
  company_id uuid,
  created_at timestamp default now()
);

-- Companies table
create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp default now()
);

alter table users add constraint users_company_id_fkey foreign key (company_id) references companies(id);
alter table employees add constraint employees_company_id_fkey foreign key (company_id) references companies(id);

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
  latitude numeric,
  longitude numeric,
  distance_from_office numeric,
  override_note text,
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
  company_id uuid references companies(id),
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
  company_id uuid references companies(id),
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

-- Password reset OTPs
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

-- Office profile settings
create table if not exists office_profiles (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id),
  name text not null,
  logo_url text,
  email text,
  phone text,
  address text,
  check_in_time time default '09:00',
  check_out_time time default '18:00',
  late_threshold_minutes int default 15,
  grace_period_minutes int default 0,
  work_days text[] default array['Monday','Tuesday','Wednesday','Thursday','Friday'],
  latitude numeric,
  longitude numeric,
  location_radius_meters int default 1000,
  location_set boolean default false,
  policies jsonb default '[]',
  created_at timestamp default now()
);

-- Configurable module permissions per role
create table if not exists role_permissions (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('super_admin', 'company_admin', 'hr_manager', 'team_lead', 'employee')),
  module text not null,
  can_view boolean default false,
  can_create boolean default false,
  can_edit boolean default false,
  can_delete boolean default false
);

create unique index if not exists role_permissions_role_module_idx
  on role_permissions(role, module);

-- Reusable AI document templates
create table if not exists document_templates (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  name text not null,
  content text not null,
  variables jsonb default '[]',
  company_id uuid references companies(id),
  created_by uuid references users(id),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists document_templates_company_type_idx
  on document_templates(company_id, type);

-- Seed default users (skip if already exist)
insert into users (email, password, role) values
('super@hr.com', 'pass123', 'super_admin'),
('hr@hr.com', 'pass123', 'hr_manager'),
('lead@hr.com', 'pass123', 'team_lead'),
('emp@hr.com', 'pass123', 'employee')
on conflict (email) do nothing;
