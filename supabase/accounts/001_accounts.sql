-- Track Standards site accounts. Runs in its OWN Supabase project (never the TPR project).
-- Tier rules (Ryan, 2026-10-19):
--   A = cumulative HS GPA 3.0+ AND at least one mark meets the Preferred Recruit outreach standard
--       (brand/context/tpr-standards.pdf, "Qualifying marks for outreach eligibility")
--   B = GPA 2.3 to 2.99, or GPA 3.0+ without a qualifying mark yet
--   C = GPA under 2.3, coaches, fans, no profile
-- Users can read and edit their own profile and marks. Tier is computed by the database only.

create table public.pr_standards (
  event   text not null,
  gender  text not null check (gender in ('m','w')),
  kind    text not null check (kind in ('time','dist')),  -- time: lower is better (seconds); dist: higher is better (metres)
  value   numeric not null,
  primary key (event, gender)
);

insert into public.pr_standards (event, gender, kind, value) values
 ('100m','m','time',11.49),            ('100m','w','time',13.24),
 ('200m','m','time',23.50),            ('200m','w','time',27.49),
 ('400m','m','time',52.50),            ('400m','w','time',61.50),
 ('800m','m','time',128.00),           ('800m','w','time',148.00),
 ('1600m','m','time',284.00),          ('1600m','w','time',360.00),
 ('3200m','m','time',624.00),          ('3200m','w','time',780.00),
 ('5000m','m','time',1019.00),         ('5000m','w','time',1380.00),
 ('110m Hurdles','m','time',15.99),    ('100m Hurdles','w','time',16.99),
 ('300m Hurdles','m','time',41.50),    ('300m Hurdles','w','time',49.50),
 ('400m Hurdles','m','time',61.00),    ('400m Hurdles','w','time',71.00),
 ('High Jump','m','dist',1.78),        ('High Jump','w','dist',1.47),
 ('Pole Vault','m','dist',3.35),       ('Pole Vault','w','dist',2.74),
 ('Long Jump','m','dist',6.10),        ('Long Jump','w','dist',5.03),
 ('Triple Jump','m','dist',12.50),     ('Triple Jump','w','dist',10.06),
 ('Shot Put','m','dist',12.80),        ('Shot Put','w','dist',9.14),
 ('Discus','m','dist',39.62),          ('Discus','w','dist',32.00),
 ('Hammer','m','dist',42.67),          ('Hammer','w','dist',36.58),
 ('Javelin','m','dist',39.62),         ('Javelin','w','dist',32.00);

-- Site event names that share a standard (the sheet lists 1600m and 110m hurdles only).
create table public.pr_event_alias (alias text primary key, event text not null);
insert into public.pr_event_alias values ('110m Hurdles (39")','110m Hurdles');

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text check (role in ('athlete','parent','coach','fan')),
  gender        text check (gender in ('m','w')),
  grade         text check (grade in ('9','10','11','12','college','other')),
  state         text check (state ~ '^[A-Z]{2}$'),
  gpa_band      text check (gpa_band in ('under_2_3','2_3_to_2_99','3_0_to_3_49','3_5_plus')),
  parent_email  text,
  parent_phone  text,
  sms_consent   boolean not null default false,
  sms_consent_at timestamptz,
  age_13_plus   boolean not null default false,
  site_sid      text,                       -- links the anonymous search log (insights.sid) after sign-up
  finished_at   timestamptz,                -- set when the Finish Account step is complete
  tier          text not null default 'C' check (tier in ('A','B','C')),
  tier_reason   text,
  opted_in_at   timestamptz,                -- clicked the evaluation offer while signed in
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.marks (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  event    text not null,
  mark     numeric not null check (mark > 0),  -- seconds for running events, metres for field events
  created_at timestamptz not null default now(),
  primary key (user_id, event)
);

-- Does this mark meet the PR outreach standard?
create or replace function public.meets_pr_standard(p_event text, p_gender text, p_mark numeric)
returns boolean language sql stable set search_path = public as $$
  select coalesce((
    select case when s.kind = 'time' then p_mark <= s.value else p_mark >= s.value end
    from public.pr_standards s
    where s.gender = p_gender
      and s.event = coalesce((select a.event from public.pr_event_alias a where a.alias = p_event), p_event)
  ), false);
$$;

create or replace function public.compute_tier(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.profiles; qualifies boolean;
begin
  select * into p from public.profiles where id = p_id;
  if not found then return; end if;
  select exists (select 1 from public.marks m where m.user_id = p_id
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

-- Users can never set their own tier or opt-in time directly.
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      new.tier := 'C'; new.tier_reason := null; new.opted_in_at := null;
    else
      new.tier := old.tier; new.tier_reason := old.tier_reason; new.opted_in_at := old.opted_in_at;
    end if;
    new.updated_at := now();
  end if;
  if new.sms_consent and new.sms_consent_at is null then new.sms_consent_at := now(); end if;
  if not new.sms_consent then new.sms_consent_at := null; end if;
  return new;
end $$;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.retier_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  perform public.compute_tier(new.id);
  return null;
end $$;
create trigger profiles_retier after insert or update of role, gender, gpa_band on public.profiles
  for each row execute function public.retier_profile();

create or replace function public.retier_marks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.compute_tier(coalesce(new.user_id, old.user_id));
  return null;
end $$;
create trigger marks_retier after insert or update or delete on public.marks
  for each row execute function public.retier_marks();

-- Signed-in opt-in (evaluation click). Records the time; the Close push stays off until Ryan approves it.
create or replace function public.record_opt_in() returns void
language sql security definer set search_path = public as $$
  update public.profiles set opted_in_at = coalesce(opted_in_at, now()) where id = auth.uid();
$$;
revoke all on function public.record_opt_in() from public, anon;
grant execute on function public.record_opt_in() to authenticated;

-- Row level security
alter table public.profiles enable row level security;
alter table public.marks enable row level security;
alter table public.pr_standards enable row level security;
alter table public.pr_event_alias enable row level security;

create policy "own profile read"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own marks read"     on public.marks for select to authenticated using (user_id = (select auth.uid()));
create policy "own marks write"    on public.marks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own marks update"   on public.marks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own marks delete"   on public.marks for delete to authenticated using (user_id = (select auth.uid()));
create policy "standards public"   on public.pr_standards for select to anon, authenticated using (true);
create policy "alias public"       on public.pr_event_alias for select to anon, authenticated using (true);

revoke all on public.profiles, public.marks from anon;
revoke delete on public.profiles from authenticated;

-- 002: trigger functions are never callable through the API (advisor 0028/0029).
revoke all on function public.retier_marks() from public, anon, authenticated;
revoke all on function public.retier_profile() from public, anon, authenticated;
revoke all on function public.profiles_guard() from public, anon, authenticated;
