-- Run in Supabase SQL Editor, once, before setting COMMUNITY_ENABLED=true.
-- Only Cloudflare's server-side service-role key may edit profiles.
create table if not exists public.community_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (nickname ~ '^[A-Za-z0-9_]{3,20}$'),
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  marketing_opt_in boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_status text not null default 'not_requested'
    check (marketing_status in ('not_requested','subscribed','pending','pending_unsubscribe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists community_nickname_ci
  on public.community_profiles(lower(nickname));
alter table public.community_profiles enable row level security;
revoke all on public.community_profiles from anon, authenticated;
-- Only the privileged server-side API role can access this table.
-- RLS bypass does not bypass ordinary PostgreSQL GRANT checks.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.community_profiles to service_role;
-- Do NOT create broad public read/write policies.
-- Server uses service_role with RLS bypass after verifying the Supabase bearer token.
