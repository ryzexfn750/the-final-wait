-- THE FINAL WAIT AIRWAYS — install in Supabase SQL Editor after community-schema.sql.
-- This migration is idempotent and backfills existing users by original join date.
-- All ticket tables are private; Cloudflare service_role is the only API writer.
create table if not exists public.community_boarding_pass_counters (
  edition text primary key check (edition in ('founders','early','final','welcome')),
  last_number bigint not null default 0 check (last_number >= 0)
);
create table if not exists public.community_boarding_passes (
  user_id uuid primary key references public.community_profiles(id) on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),
  edition text not null check (edition in ('founders','early','final','welcome')),
  serial_number bigint not null check (serial_number > 0),
  ticket_code text not null unique,
  registered_at timestamptz not null,
  issued_at timestamptz not null default now(),
  unique (edition,serial_number)
);
create index if not exists community_boarding_passes_public_lookup
  on public.community_boarding_passes(public_id);
alter table public.community_boarding_passes enable row level security;
alter table public.community_boarding_pass_counters enable row level security;
revoke all on public.community_boarding_passes from public,anon,authenticated;
revoke all on public.community_boarding_pass_counters from public,anon,authenticated;
grant usage on schema public to service_role;
grant select,insert,update,delete on public.community_boarding_passes to service_role;
grant select,insert,update,delete on public.community_boarding_pass_counters to service_role;

-- Row-lock the profile first, then allocate a counter in one transaction.
-- Safe if a registration trigger and a lazy/backfill request race each other.
create or replace function public.issue_community_boarding_pass(p_user uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  joined timestamptz;
  nickname_value text;
  edition_value text;
  prefix_value text;
  number_value bigint;
  result_value jsonb;
begin
  select p.created_at,p.nickname into joined,nickname_value
    from public.community_profiles p where p.id=p_user for update;
  if not found then
    raise exception 'Community account not found' using errcode='P0002';
  end if;
  select jsonb_build_object(
    'publicId',b.public_id::text,'ticketCode',b.ticket_code,
    'edition',b.edition,'registeredAt',b.registered_at,
    'nickname',nickname_value
  ) into result_value
    from public.community_boarding_passes b where b.user_id=p_user;
  if result_value is not null then return result_value; end if;

  -- Founders also includes all existing members registered before November 1.
  if (joined at time zone 'UTC')::date < date '2026-11-06' then
    edition_value:='founders'; prefix_value:='F';
  elsif (joined at time zone 'UTC')::date < date '2026-11-11' then
    edition_value:='early'; prefix_value:='E';
  elsif (joined at time zone 'UTC')::date < date '2026-11-19' then
    edition_value:='final'; prefix_value:='B';
  else
    edition_value:='welcome'; prefix_value:='W';
  end if;

  insert into public.community_boarding_pass_counters as c (edition,last_number)
    values (edition_value,1)
    on conflict (edition) do update set last_number=c.last_number+1
    returning last_number into number_value;

  insert into public.community_boarding_passes
    (user_id,edition,serial_number,ticket_code,registered_at)
    values (p_user,edition_value,number_value,
      prefix_value||'-'||lpad(number_value::text,greatest(5,length(number_value::text)),'0'),joined);

  select jsonb_build_object(
    'publicId',b.public_id::text,'ticketCode',b.ticket_code,
    'edition',b.edition,'registeredAt',b.registered_at,
    'nickname',nickname_value
  ) into result_value from public.community_boarding_passes b where b.user_id=p_user;
  return result_value;
end $$;

revoke all on function public.issue_community_boarding_pass(uuid) from public,anon,authenticated;
grant execute on function public.issue_community_boarding_pass(uuid) to service_role;

create or replace function public.community_assign_boarding_pass()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.issue_community_boarding_pass(new.id);
  return new;
end $$;
revoke all on function public.community_assign_boarding_pass() from public,anon,authenticated;

drop trigger if exists community_auto_boarding_pass on public.community_profiles;
create trigger community_auto_boarding_pass
after insert on public.community_profiles
for each row execute function public.community_assign_boarding_pass();

-- Existing accounts: maintain their real original dates and stable unique IDs.
-- Backfill order guarantees earlier existing registrations get earlier numbers.
do $$
declare member record;
begin
  for member in
    select p.id from public.community_profiles p
      left join public.community_boarding_passes b on b.user_id=p.id
      where b.user_id is null order by p.created_at,p.id
  loop
    perform public.issue_community_boarding_pass(member.id);
  end loop;
end $$;
