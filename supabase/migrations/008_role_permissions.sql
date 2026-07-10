-- Configurable role permissions for HRFlow modules.
create table if not exists role_permissions (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('super_admin', 'company_admin', 'hr_manager', 'team_lead', 'employee')),
  module text not null,
  can_view boolean default false,
  can_create boolean default false,
  can_edit boolean default false,
  can_delete boolean default false
);

-- Keep one row if this table was manually seeded before the migration.
delete from role_permissions older
using role_permissions newer
where older.role = newer.role
  and older.module = newer.module
  and older.ctid < newer.ctid;

create unique index if not exists role_permissions_role_module_idx
  on role_permissions(role, module);

with roles(role) as (
  values ('super_admin'), ('company_admin'), ('hr_manager'), ('team_lead'), ('employee')
), modules(module) as (
  values
    ('dashboard'), ('employees'), ('attendance'), ('leaves'), ('payroll'),
    ('recruitment'), ('performance'), ('announcements'), ('ai_assistant'),
    ('reports'), ('settings')
), defaults as (
  select
    role,
    module,
    case
      when role in ('super_admin', 'company_admin') then true
      when role = 'hr_manager' then module <> 'settings'
      when role = 'team_lead' then module <> 'settings'
      when role = 'employee' then module in ('dashboard', 'attendance', 'leaves', 'payroll', 'performance', 'announcements', 'ai_assistant')
      else false
    end as can_view,
    case
      when role in ('super_admin', 'company_admin') then true
      when role = 'hr_manager' then module in ('employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'performance', 'announcements', 'ai_assistant', 'reports')
      when role = 'team_lead' then module in ('attendance', 'leaves', 'performance', 'ai_assistant')
      when role = 'employee' then module in ('attendance', 'leaves', 'ai_assistant')
      else false
    end as can_create,
    case
      when role in ('super_admin', 'company_admin') then true
      when role = 'hr_manager' then module in ('employees', 'attendance', 'leaves', 'recruitment', 'performance', 'announcements', 'ai_assistant')
      when role = 'team_lead' then module in ('attendance', 'leaves', 'performance', 'ai_assistant')
      else false
    end as can_edit,
    role in ('super_admin', 'company_admin') as can_delete
  from roles cross join modules
)
insert into role_permissions (role, module, can_view, can_create, can_edit, can_delete)
select role, module, can_view, can_create, can_edit, can_delete from defaults
on conflict (role, module) do nothing;
