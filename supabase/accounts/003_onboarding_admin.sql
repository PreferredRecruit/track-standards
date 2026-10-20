-- 003 (Ryan 2026-10-19): onboarding page fields + master (admin) logins.
-- Funnel questions use the same answers as the parent funnel / Close (references/business-data/close_lead_quality.csv).

alter table public.profiles
  add column first_name text check (char_length(first_name) <= 60),
  add column last_name text check (char_length(last_name) <= 60),
  add column phone text check (char_length(phone) <= 30),          -- the account owner's phone (parents and adults only)
  add column athlete_first_name text check (char_length(athlete_first_name) <= 60),   -- when a parent builds the profile
  add column parent_name text check (char_length(parent_name) <= 80),                 -- when an athlete builds the profile
  add column grad_year int check (grad_year between 2024 and 2035),
  add column gpa numeric(3,2) check (gpa >= 0 and gpa <= 5),
  add column recruiting_stage text check (recruiting_stage in ('getting_started','talking','real_interest','offers')),
  add column seriousness text check (seriousness in ('dream','serious','exploring','not_sure')),
  add column parent_involvement text check (parent_involvement in ('both','mom','dad','none_yet')),
  add column onboarding_step int not null default 0;

-- GPA number drives the band (and so the tier): 3.0+ / 2.3 to 2.99 / under 2.3
create or replace function public.profiles_gpa_band() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.gpa is not null then
    new.gpa_band := case when new.gpa >= 3.5 then '3_5_plus' when new.gpa >= 3.0 then '3_0_to_3_49' when new.gpa >= 2.3 then '2_3_to_2_99' else 'under_2_3' end;
  end if;
  return new;
end $$;
revoke all on function public.profiles_gpa_band() from public, anon, authenticated;
create trigger profiles_gpa_band before insert or update on public.profiles for each row execute function public.profiles_gpa_band();

drop trigger profiles_retier on public.profiles;
create trigger profiles_retier after insert or update of role, gender, gpa_band, gpa on public.profiles
  for each row execute function public.retier_profile();

-- Master logins: admins are matched by verified email. The list is not readable through the API.
create table public.admin_emails (email text primary key check (email = lower(email)), name text not null, added_at timestamptz not null default now());
alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;
insert into public.admin_emails (email, name) values ('ryanapsearl@gmail.com', 'Ryan Searl');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users u join public.admin_emails a on a.email = lower(u.email)
                 where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admins read all profiles" on public.profiles for select to authenticated using ((select public.is_admin()));
create policy "admins read all marks"    on public.marks    for select to authenticated using ((select public.is_admin()));

-- Admin list with sign-up emails (security definer, admins only)
create or replace function public.admin_accounts() returns table (
  id uuid, email text, created_at timestamptz, confirmed boolean, role text, first_name text, last_name text, phone text,
  athlete_first_name text, parent_name text, parent_email text, parent_phone text, sms_consent boolean, gender text, grade text,
  grad_year int, state text, gpa numeric, tier text, tier_reason text, recruiting_stage text, seriousness text,
  parent_involvement text, finished_at timestamptz, opted_in_at timestamptz, marks jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.email_confirmed_at is not null, p.role, p.first_name, p.last_name, p.phone,
      p.athlete_first_name, p.parent_name, p.parent_email, p.parent_phone, p.sms_consent, p.gender, p.grade,
      p.grad_year, p.state, p.gpa, coalesce(p.tier, 'C'), p.tier_reason, p.recruiting_stage, p.seriousness,
      p.parent_involvement, p.finished_at, p.opted_in_at,
      coalesce((select jsonb_agg(jsonb_build_object('e', m.event, 'm', m.mark) order by m.created_at) from public.marks m where m.user_id = u.id), '[]'::jsonb)
    from auth.users u left join public.profiles p on p.id = u.id
    where not exists (select 1 from public.admin_emails a where a.email = lower(u.email))
    order by u.created_at desc;
end $$;
revoke all on function public.admin_accounts() from public, anon;
grant execute on function public.admin_accounts() to authenticated;
