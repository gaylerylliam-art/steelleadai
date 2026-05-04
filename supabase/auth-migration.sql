-- Run this on an existing SteelLead AI Supabase database to enforce per-user leads.
-- Existing rows with created_by = null will become hidden from app users until assigned
-- to a real auth.users.id.

drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can insert leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;

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
