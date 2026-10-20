-- 006 (Ryan 2026-10-19): parents can add several athletes (each graded on its own), custom banners.
-- "parent accounts can add athletes depending on how many kids they have, so we can grade them too and send more pop ups like 'your kids'"

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text check (char_length(last_name) <= 60),
  gender text check (gender in ('m','w')),
  grad_year int check (grad_year between 2024 and 2035),
  grade text check (grade in ('9','10','11','12','college','other')),
  state text check (state ~ '^[A-Z]{2}$'),
  high_school text check (char_length(high_school) <= 100),
  gpa numeric(3,2) check (gpa >= 0 and gpa <= 5),
  gpa_band text,
  tier text not null default 'C' check (tier in ('A','B','C')),
  tier_reason text,
  avatar_path text check (char_length(avatar_path) <= 200),
  banner_path text check (char_length(banner_path) <= 200),
  banner_theme text check (char_length(banner_theme) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index athletes_parent on public.athletes(parent_id);

alter table public.profiles add column banner_path text check (char_length(banner_path) <= 200), add column banner_theme text check (char_length(banner_theme) <= 20);

-- marks: one row per (owner, athlete or self, event)
alter table public.marks drop constraint marks_pkey;
alter table public.marks add column id bigint generated always as identity primary key,
  add column athlete_id uuid references public.athletes(id) on delete cascade;
create unique index marks_one_per_event on public.marks (user_id, coalesce(athlete_id, '00000000-0000-0000-0000-000000000000'::uuid), event);

-- athlete GPA band + guard (parents can't set tiers)
create or replace function public.athletes_before() returns trigger language plpgsql set search_path = public as $$
begin
  if new.gpa is not null then
    new.gpa_band := case when new.gpa >= 3.5 then '3_5_plus' when new.gpa >= 3.0 then '3_0_to_3_49' when new.gpa >= 2.3 then '2_3_to_2_99' else 'under_2_3' end;
  else new.gpa_band := null; end if;
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then new.tier := 'C'; new.tier_reason := null; else new.tier := old.tier; new.tier_reason := old.tier_reason; new.parent_id := old.parent_id; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger athletes_before before insert or update on public.athletes for each row execute function public.athletes_before();

create or replace function public.compute_athlete_tier(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.athletes; qualifies boolean;
begin
  select * into a from public.athletes where id = p_id; if not found then return; end if;
  select exists (select 1 from public.marks m where m.athlete_id = p_id and public.meets_pr_standard(m.event, a.gender, m.mark)) into qualifies;
  update public.athletes set
    tier = case when a.gpa_band is null then 'C' when a.gpa_band in ('3_0_to_3_49','3_5_plus') and qualifies then 'A' when a.gpa_band in ('3_0_to_3_49','3_5_plus','2_3_to_2_99') then 'B' else 'C' end,
    tier_reason = case when a.gpa_band is null then 'no GPA yet' when a.gpa_band in ('3_0_to_3_49','3_5_plus') and qualifies then 'GPA 3.0+ and meets PR standard'
      when a.gpa_band in ('3_0_to_3_49','3_5_plus') then 'GPA 3.0+, no qualifying mark yet' when a.gpa_band = '2_3_to_2_99' then 'GPA 2.3 to 2.99' else 'GPA under 2.3' end
  where id = p_id;
  perform public.compute_tier(a.parent_id);
end $$;
revoke all on function public.compute_athlete_tier(uuid) from public, anon, authenticated;

-- parents take the best tier among their athletes
create or replace function public.compute_tier(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.profiles; qualifies boolean; best text;
begin
  select * into p from public.profiles where id = p_id;
  if not found then return; end if;
  if p.role = 'parent' then
    select min(tier) into best from public.athletes where parent_id = p_id;   -- 'A' < 'B' < 'C'
    update public.profiles set tier = coalesce(best, 'C'), tier_reason = case when best is null then 'no athletes yet' else 'best athlete tier ' || best end, updated_at = now() where id = p_id;
    return;
  end if;
  select exists (select 1 from public.marks m where m.user_id = p_id and m.athlete_id is null
                 and public.meets_pr_standard(m.event, p.gender, m.mark)) into qualifies;
  update public.profiles set
    tier = case
      when p.role not in ('athlete','parent') or p.role is null or p.gpa_band is null then 'C'
      when p.gpa_band in ('3_0_to_3_49','3_5_plus') and qualifies then 'A'
      when p.gpa_band in ('3_0_to_3_49','3_5_plus','2_3_to_2_99') then 'B'
      else 'C' end,
    tier_reason = case
      when p.role not in ('athlete','parent') or p.role is null then 'not athlete/parent'
      when p.gpa_band is null then 'no GPA yet'
      when p.gpa_band in ('3_0_to_3_49','3_5_plus') and qualifies then 'GPA 3.0+ and meets PR standard'
      when p.gpa_band in ('3_0_to_3_49','3_5_plus') then 'GPA 3.0+, no qualifying mark yet'
      when p.gpa_band = '2_3_to_2_99' then 'GPA 2.3 to 2.99'
      else 'GPA under 2.3' end,
    updated_at = now()
  where id = p_id;
end $$;
revoke all on function public.compute_tier(uuid) from public, anon, authenticated;

create or replace function public.retier_athlete() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then perform public.compute_tier(old.parent_id); return null; end if;
  if pg_trigger_depth() > 1 then return null; end if;
  perform public.compute_athlete_tier(new.id); return null;
end $$;
revoke all on function public.retier_athlete() from public, anon, authenticated;
create trigger athletes_retier after insert or update of gpa, gender or delete on public.athletes for each row execute function public.retier_athlete();

create or replace function public.retier_marks() returns trigger
language plpgsql security definer set search_path = public as $$
declare aid uuid := coalesce(new.athlete_id, old.athlete_id);
begin
  if aid is not null then perform public.compute_athlete_tier(aid);
  else perform public.compute_tier(coalesce(new.user_id, old.user_id)); end if;
  return null;
end $$;
revoke all on function public.retier_marks() from public, anon, authenticated;

-- row-level security: parents manage their own athletes; admins read all
alter table public.athletes enable row level security;
create policy "own athletes read"   on public.athletes for select to authenticated using (parent_id = (select auth.uid()));
create policy "own athletes insert" on public.athletes for insert to authenticated with check (parent_id = (select auth.uid()));
create policy "own athletes update" on public.athletes for update to authenticated using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
create policy "own athletes delete" on public.athletes for delete to authenticated using (parent_id = (select auth.uid()));
create policy "admins read athletes" on public.athletes for select to authenticated using ((select public.is_admin()));
revoke all on public.athletes from anon;

drop policy "own marks write" on public.marks;
drop policy "own marks update" on public.marks;
create policy "own marks write" on public.marks for insert to authenticated with check (user_id = (select auth.uid()) and (athlete_id is null or exists (select 1 from public.athletes a where a.id = athlete_id and a.parent_id = (select auth.uid()))));
create policy "own marks update" on public.marks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (athlete_id is null or exists (select 1 from public.athletes a where a.id = athlete_id and a.parent_id = (select auth.uid()))));

-- admin list v3: athletes (with their marks) per account
drop function public.admin_accounts();
create function public.admin_accounts() returns table (
  id uuid, email text, created_at timestamptz, confirmed boolean, role text, first_name text, last_name text, phone text,
  parent_name text, parent_email text, parent_phone text, sms_consent boolean, gender text, grade text,
  grad_year int, state text, high_school text, gpa numeric, tier text, tier_reason text,
  avatar_path text, finished_at timestamptz, opted_in_at timestamptz, marks jsonb, athletes jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.email_confirmed_at is not null, p.role, p.first_name, p.last_name, p.phone,
      p.parent_name, p.parent_email, p.parent_phone, p.sms_consent, p.gender, p.grade,
      p.grad_year, p.state, p.high_school, p.gpa, coalesce(p.tier, 'C'), p.tier_reason, p.avatar_path, p.finished_at, p.opted_in_at,
      coalesce((select jsonb_agg(jsonb_build_object('e', m.event, 'm', m.mark) order by m.id) from public.marks m where m.user_id = u.id and m.athlete_id is null), '[]'::jsonb),
      coalesce((select jsonb_agg(jsonb_build_object('first_name', a.first_name, 'last_name', a.last_name, 'gender', a.gender, 'grad_year', a.grad_year, 'state', a.state,
        'high_school', a.high_school, 'gpa', a.gpa, 'tier', a.tier, 'marks',
        coalesce((select jsonb_agg(jsonb_build_object('e', m.event, 'm', m.mark) order by m.id) from public.marks m where m.athlete_id = a.id), '[]'::jsonb)) order by a.created_at)
        from public.athletes a where a.parent_id = u.id), '[]'::jsonb)
    from auth.users u left join public.profiles p on p.id = u.id
    where not exists (select 1 from public.admin_emails a where a.email = lower(u.email))
    order by u.created_at desc;
end $$;
revoke all on function public.admin_accounts() from public, anon;
grant execute on function public.admin_accounts() to authenticated;
