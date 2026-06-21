-- Migration 006: company admin support and office profile settings
create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp default now()
);

alter table users add column if not exists company_id uuid references companies(id);
alter table employees add column if not exists company_id uuid references companies(id);
alter table jobs add column if not exists company_id uuid references companies(id);
alter table announcements add column if not exists company_id uuid references companies(id);

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('super_admin', 'company_admin', 'hr_manager', 'team_lead', 'employee'));

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

alter table office_profiles add column if not exists grace_period_minutes int default 0;
alter table office_profiles add column if not exists work_days text[] default array['Monday','Tuesday','Wednesday','Thursday','Friday'];

create index if not exists office_profiles_company_id_idx on office_profiles(company_id);
create index if not exists employees_company_id_idx on employees(company_id);
create index if not exists users_company_id_idx on users(company_id);
create index if not exists jobs_company_id_idx on jobs(company_id);
create index if not exists announcements_company_id_idx on announcements(company_id);
