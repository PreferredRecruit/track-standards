-- 008 (Ryan 2026-10-25): data that feeds the lead score, collected on the site, never pushed to Close automatically.
--   goals      target divisions + how much an athletic scholarship matters (onboarding "Goals" step, conditional)
--   readiness  Recruitment Readiness quiz: answers + 0-100 score (the athlete sees the score and next steps)
--   intent     school standards views (5+ = high intent, the moment an on-site prompt opens)
-- lead_score(profile) is computed on read (admin views, pop-up choice), so no user can write it and it is always current.

alter table public.profiles
  add column if not exists target_divisions text[],
  add column if not exists scholarship_priority text,
  add column if not exists readiness jsonb,
  add column if not exists readiness_score smallint,
  add column if not exists readiness_at timestamptz,
  add column if not exists school_views integer not null default 0,
  add column if not exists high_intent_at timestamptz;

alter table public.profiles drop constraint if exists profiles_target_divisions_check;
alter table public.profiles add constraint profiles_target_divisions_check
  check (target_divisions is null or (target_divisions <@ array['D1','D2','D3','NAIA','JUCO','not_sure']::text[] and coalesce(array_length(target_divisions, 1), 0) <= 6));
alter table public.profiles drop constraint if exists profiles_scholarship_priority_check;
alter table public.profiles add constraint profiles_scholarship_priority_check
  check (scholarship_priority is null or scholarship_priority in ('need', 'helps', 'not_needed', 'not_sure'));
alter table public.profiles drop constraint if exists profiles_readiness_score_check;
alter table public.profiles add constraint profiles_readiness_score_check check (readiness_score is null or readiness_score between 0 and 100);
alter table public.profiles drop constraint if exists profiles_readiness_size_check;
alter table public.profiles add constraint profiles_readiness_size_check check (readiness is null or pg_column_size(readiness) <= 4000);
alter table public.profiles drop constraint if exists profiles_school_views_check;
alter table public.profiles add constraint profiles_school_views_check check (school_views between 0 and 100000);

-- Lead score, 0-100. Weights proposed 2026-10-25 (grade and parent contact first: juniors/seniors and parents buy;
-- brand/context/PERFORMANCE-INSIGHTS.md). A parent account is scored on its best athlete.
create or replace function public.lead_score(p public.profiles)
returns integer language sql stable security definer set search_path = public as $$
  with kid as (
    select a.grade, a.grad_year, a.tier from public.athletes a where a.parent_id = p.id
    order by public.tier_rank(a.tier) nulls last limit 1
  ), g as (
    select case when p.role = 'parent' then (select grade from kid) else p.grade end as grade,
           case when p.role = 'parent' then coalesce((select tier from kid), p.tier) else p.tier end as tier
  )
  select least(100,
      (case g.grade when '11' then 30 when '12' then 30 when '10' then 15 else 0 end)
    + (case g.tier when 'A+' then 25 when 'A' then 22 when 'B' then 10 else 0 end)
    + (case when p.role = 'parent' and coalesce(p.phone, '') <> '' then 20
            when p.role = 'athlete' and (coalesce(p.parent_email, '') <> '' or coalesce(p.parent_phone, '') <> '') then 20 else 0 end)
    + (case p.recruiting_stage when 'offers' then 15 when 'real_interest' then 12 when 'talking' then 10 when 'getting_started' then 5 else 0 end)
    + least(10,
        (case when p.opted_in_at is not null then 5 else 0 end)
      + (case when p.high_intent_at is not null then 4 else 0 end)
      + (case when p.readiness_score is not null then 3 else 0 end)
      + (case when coalesce(array_length(p.dream_schools, 1), 0) > 0 then 2 else 0 end)
      + (case when coalesce(array_length(p.target_divisions, 1), 0) > 0 then 1 else 0 end)))::integer
  from g;
$$;
revoke all on function public.lead_score(public.profiles) from public, anon;
grant execute on function public.lead_score(public.profiles) to authenticated;

-- an owner can read their own score (the pop-up uses it); admins read everyone's through admin_accounts()
create or replace function public.my_lead_score()
returns integer language sql stable security definer set search_path = public as $$
  select public.lead_score(p) from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.my_lead_score() from public, anon;
grant execute on function public.my_lead_score() to authenticated;

-- intent: count a school standards view; the 5th view stamps high_intent_at once (server-side, so it can't be faked forward)
create or replace function public.record_school_view()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.profiles set school_views = school_views + 1,
         high_intent_at = case when high_intent_at is null and school_views + 1 >= 5 then now() else high_intent_at end
   where id = auth.uid() returning school_views into n;
  return coalesce(n, 0);
end $$;
revoke all on function public.record_school_view() from public, anon;
grant execute on function public.record_school_view() to authenticated;

-- users can't write the intent fields directly (only through record_school_view)
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      new.tier := 'C'; new.tier_reason := null; new.opted_in_at := null; new.school_views := 0; new.high_intent_at := null;
    else
      new.tier := old.tier; new.tier_reason := old.tier_reason; new.opted_in_at := old.opted_in_at;
      new.school_views := old.school_views; new.high_intent_at := old.high_intent_at;
    end if;
    new.updated_at := now();
  end if;
  if new.sms_consent and new.sms_consent_at is null then new.sms_consent_at := now(); end if;
  if not new.sms_consent then new.sms_consent_at := null; end if;
  return new;
end $function$;

-- admin view: same columns as before + the new ones at the end (dashboard code reads by name)
drop function if exists public.admin_accounts();
create function public.admin_accounts()
 returns table(id uuid, email text, created_at timestamp with time zone, confirmed boolean, role text, first_name text, last_name text, phone text,
   parent_name text, parent_email text, parent_phone text, sms_consent boolean, gender text, grade text, grad_year integer, state text, high_school text,
   gpa numeric, tier text, tier_reason text, avatar_path text, finished_at timestamp with time zone, opted_in_at timestamp with time zone, marks jsonb,
   athletes jsonb, dream_schools text[], last_sign_in timestamp with time zone,
   lead_score integer, recruiting_stage text, target_divisions text[], scholarship_priority text, readiness_score smallint, readiness jsonb,
   school_views integer, high_intent_at timestamp with time zone)
 language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.email_confirmed_at is not null, p.role, p.first_name, p.last_name, p.phone,
      p.parent_name, p.parent_email, p.parent_phone, p.sms_consent, p.gender, p.grade,
      p.grad_year, p.state, p.high_school, p.gpa, coalesce(p.tier, 'C'), p.tier_reason, p.avatar_path, p.finished_at, p.opted_in_at,
      coalesce((select jsonb_agg(jsonb_build_object('e', m.event, 'm', m.mark) order by m.id) from public.marks m where m.user_id = u.id and m.athlete_id is null), '[]'::jsonb),
      coalesce((select jsonb_agg(jsonb_build_object('first_name', a.first_name, 'last_name', a.last_name, 'gender', a.gender, 'grad_year', a.grad_year, 'state', a.state,
        'high_school', a.high_school, 'gpa', a.gpa, 'tier', a.tier, 'email', a.email, 'phone', a.phone, 'dream_schools', a.dream_schools, 'marks',
        coalesce((select jsonb_agg(jsonb_build_object('e', m.event, 'm', m.mark) order by m.id) from public.marks m where m.athlete_id = a.id), '[]'::jsonb)) order by a.created_at)
        from public.athletes a where a.parent_id = u.id), '[]'::jsonb),
      p.dream_schools, u.last_sign_in_at,
      case when p.id is null then 0 else public.lead_score(p) end, p.recruiting_stage, p.target_divisions, p.scholarship_priority,
      p.readiness_score, p.readiness, p.school_views, p.high_intent_at
    from auth.users u left join public.profiles p on p.id = u.id
    where not exists (select 1 from public.admin_emails a where a.email = lower(u.email))
    order by u.created_at desc;
end $function$;
revoke all on function public.admin_accounts() from public, anon;
grant execute on function public.admin_accounts() to authenticated;
