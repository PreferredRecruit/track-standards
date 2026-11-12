-- 019 Premium v2 (Ryan 2026-11-12, approved). NOT used by the live site until the premium build is pushed.
-- Access by purchase:  lt27 = the $27 7-Day Roadmap  -> Premium account (dashboard, My College List, Premium Dark/White)
--                      em17 = the $17 coach emails bump -> coach emails (Coach Contacts)
--                      comp = free access Ryan approved (e.g. Abe at Emberly) -> both when granted with bump=true
-- Only these products can be granted; a Whop login on its own grants nothing. Admin emails (admin_emails) always get both.
-- Premium turns on when the confirmed account email matches the checkout email (claimed to that one account).

-- products allowed
create or replace function public.premium_grant(secret text, email text, order_id text, product text default 'lt27', bump boolean default false)
returns text language plpgsql security definer set search_path to 'public','premium','private' as $$
declare t uuid; em text := lower(trim(premium_grant.email)); oid text := trim(premium_grant.order_id); p text := coalesce(premium_grant.product, 'lt27');
begin
  if not private.secret_ok('premium_grant', secret) then raise exception 'not allowed'; end if;
  if p not in ('lt27','em17','comp') then raise exception 'product not allowed'; end if;
  if coalesce(em, '') !~ '^\S+@\S+\.\S+$' or coalesce(oid, '') = '' then raise exception 'email and order_id required'; end if;
  insert into premium.entitlements as x (order_id, email, product, bump) values (oid, em, p, coalesce(premium_grant.bump, false) or p = 'em17')
    on conflict on constraint entitlements_order_id_key do update set bump = x.bump or excluded.bump, revoked_at = null
    returning x.claim_token into t;
  return 'https://trackandfieldstandards.com/premium?claim=' || t;
end $$;

-- account preference: Premium Dark (default) or Premium White
alter table public.profiles add column if not exists premium_theme text not null default 'dark' check (premium_theme in ('dark','light'));

-- what this account has: no side effects, safe inside policies; only your own account (or any, for admins)
create or replace function public.premium_flags(uid uuid default auth.uid())
returns table(premium boolean, emails boolean, admin boolean, since timestamptz)
language sql stable security definer set search_path to 'public','premium' as $$
  with ok as (select (uid = auth.uid() or public.is_admin() or auth.uid() is null and current_user in ('postgres','service_role')) v),
  a as (select exists (select 1 from auth.users u join public.admin_emails m on m.email = lower(u.email) where u.id = uid and u.email_confirmed_at is not null) adm),
  e as (select product, bump, granted_at from premium.entitlements where user_id = uid and revoked_at is null)
  select (select v from ok) and ((select adm from a) or exists (select 1 from e where product in ('lt27','comp'))),
         (select v from ok) and ((select adm from a) or exists (select 1 from e where product = 'em17' or bump)),
         (select v from ok) and (select adm from a),
         case when (select v from ok) then (select min(granted_at) from e) end;
$$;
revoke all on function public.premium_flags(uuid) from public, anon;
grant execute on function public.premium_flags(uuid) to authenticated;

-- premium_me: claims every unclaimed order bought with this account's confirmed email, then reports access
create or replace function public.premium_me() returns jsonb
language plpgsql security definer set search_path to 'public','premium' as $$
declare uid uuid := auth.uid(); em text; f record; th text;
begin
  if uid is null then return jsonb_build_object('premium', false, 'emails', false); end if;
  select lower(email) into em from auth.users where id = uid and email_confirmed_at is not null;
  if em is not null then
    update premium.entitlements set user_id = uid, claimed_at = now() where user_id is null and revoked_at is null and email = em;
  end if;
  select * into f from public.premium_flags(uid);
  select premium_theme into th from public.profiles where id = uid;
  return jsonb_build_object('premium', f.premium, 'emails', f.emails, 'bump', f.emails, 'admin', f.admin, 'since', f.since, 'theme', coalesce(th, 'dark'));
end $$;

-- coach emails need the $17 (or admin / comp with bump)
create or replace function public.coach_roster(slug text)
returns table(name text, title text, groups text[], gender text, email text, verified_at date)
language plpgsql security definer set search_path to 'public','premium' as $$
declare uid uuid := auth.uid(); n int; f record;
begin
  if uid is null then raise exception 'premium'; end if;
  perform public.premium_me();
  select * into f from public.premium_flags(uid);
  if not f.emails then raise exception 'emails'; end if;
  insert into premium.roster_views (user_id, slug) values (uid, coach_roster.slug) on conflict do nothing;
  select count(*) into n from premium.roster_views where user_id = uid and day = current_date;
  if n > 60 and not f.admin then raise exception 'limit'; end if;
  return query select r.name, r.title, r.groups, r.gender, r.email, r.verified_at from premium.coach_roster r where r.slug = coach_roster.slug
    order by (r.title ilike '%head%') desc, r.name;
end $$;

-- My College List: up to 25 colleges per athlete (athlete_id null = the account's own athlete profile)
create table if not exists public.college_list (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  athlete_id uuid references public.athletes(id) on delete cascade,
  slug text not null check (char_length(slug) between 1 and 120),
  name text not null check (char_length(name) between 1 and 160),
  cat text not null default 'target' check (cat in ('dream','target','reach')),
  rank int not null default 0,
  coach_name text check (char_length(coach_name) <= 120),
  coach_email text check (char_length(coach_email) <= 200),
  created_at timestamptz not null default now());
create unique index if not exists college_list_one on public.college_list (user_id, coalesce(athlete_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
alter table public.college_list enable row level security;
create policy "own list read"   on public.college_list for select to authenticated using (user_id = (select auth.uid()));
create policy "own list insert" on public.college_list for insert to authenticated with check (user_id = (select auth.uid())
  and (select premium from public.premium_flags((select auth.uid())))
  and (athlete_id is null or exists (select 1 from public.athletes a where a.id = athlete_id and a.parent_id = (select auth.uid()))));
create policy "own list update" on public.college_list for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own list delete" on public.college_list for delete to authenticated using (user_id = (select auth.uid()));
create policy "admins read lists" on public.college_list for select to authenticated using ((select public.is_admin()));
create or replace function public.college_list_cap() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.college_list where user_id = new.user_id and athlete_id is not distinct from new.athlete_id) >= 25 then
    raise exception 'list full'; end if;
  return new;
end $$;
drop trigger if exists college_list_cap on public.college_list;
create trigger college_list_cap before insert on public.college_list for each row execute function public.college_list_cap();

-- admin overview counts (admins only)
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path to 'public','premium' as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return jsonb_build_object(
    'accounts', (select count(*) from public.profiles),
    'new_week', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'finished', (select count(*) from public.profiles where finished_at is not null),
    'premium', (select count(distinct coalesce(user_id::text, email)) from premium.entitlements where revoked_at is null and product in ('lt27')),
    'emails', (select count(distinct coalesce(user_id::text, email)) from premium.entitlements where revoked_at is null and (product = 'em17' or bump) and product <> 'comp'),
    'premium_week', (select count(*) from premium.entitlements where revoked_at is null and product = 'lt27' and granted_at > now() - interval '7 days'),
    'waiting', (select count(*) from premium.entitlements where revoked_at is null and user_id is null and product <> 'comp'),
    'lists_opened_week', (select count(*) from premium.roster_views where day > current_date - 7),
    'colleges_listed', (select count(*) from public.college_list));
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
