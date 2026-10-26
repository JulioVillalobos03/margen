-- Base preparada para sincronización autenticada. No ejecutada automáticamente.
begin;
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.offer_evaluations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  source text not null check (source in ('manual', 'example')),
  offer jsonb not null check (jsonb_typeof(offer) = 'object'),
  settings_snapshot jsonb not null check (jsonb_typeof(settings_snapshot) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  calculation_version integer not null check (calculation_version = 1),
  synced_at timestamptz not null default now()
);
create index evaluations_user_date on public.offer_evaluations(user_id, created_at desc);
create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('trial', 'courtesy')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  reason text not null,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);
alter table public.profiles enable row level security;
alter table public.offer_evaluations enable row level security;
alter table public.access_grants enable row level security;
revoke all on public.profiles, public.offer_evaluations, public.access_grants from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, delete on public.offer_evaluations to authenticated;
grant select on public.access_grants to authenticated;
grant all on public.profiles, public.offer_evaluations, public.access_grants to service_role;
create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);
create policy evaluations_select on public.offer_evaluations for select to authenticated using ((select auth.uid()) = user_id);
create policy evaluations_insert on public.offer_evaluations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy evaluations_delete on public.offer_evaluations for delete to authenticated using ((select auth.uid()) = user_id);
create policy grants_select on public.access_grants for select to authenticated using ((select auth.uid()) = user_id);
commit;
