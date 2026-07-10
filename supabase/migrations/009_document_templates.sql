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

