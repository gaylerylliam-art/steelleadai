create extension if not exists "pgcrypto";

create type public.lead_status as enum (
  'New Lead',
  'Contacted',
  'Quotation Sent',
  'Negotiation',
  'Won',
  'Lost'
);

create type public.project_size as enum ('Small', 'Medium', 'Large', 'Mega');
create type public.urgency_level as enum ('Low', 'Medium', 'High', 'Immediate');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  job_title text,
  email text,
  phone text,
  emirate text not null,
  industry text not null,
  project_type text,
  project_size public.project_size not null default 'Medium',
  products_required text[] not null default '{}',
  lead_source text,
  status public.lead_status not null default 'New Lead',
  notes text,
  urgency public.urgency_level not null default 'Medium',
  past_inquiry boolean not null default false,
  next_follow_up date,
  score integer not null default 0 check (score >= 0 and score <= 100),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_emirate_idx on public.leads (emirate);
create index leads_industry_idx on public.leads (industry);
create index leads_score_idx on public.leads (score desc);
create index leads_next_follow_up_idx on public.leads (next_follow_up);
create index leads_products_required_idx on public.leads using gin (products_required);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

create policy "Authenticated users can read leads"
on public.leads for select
to authenticated
using (auth.uid() = created_by);

create policy "Authenticated users can insert leads"
on public.leads for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Authenticated users can update leads"
on public.leads for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Authenticated users can delete leads"
on public.leads for delete
to authenticated
using (auth.uid() = created_by);
