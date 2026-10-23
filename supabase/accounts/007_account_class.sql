-- 007 (Ryan 2026-10-23): account class on top of the A/B/C quality tier.
-- "The absolute best accounts are family/parent accounts that have kids added who are sophomores, juniors, or seniors,
--  provided they have all the correct information. Parent accounts without kids added ... middle-tier."
--   S        parent + own name and phone + at least one sophomore/junior/senior athlete with first + last name, class year,
--            state, Men/Women, GPA and a mark (same "complete" fields as the A+ rule)
--   M        any other parent account (no athletes yet, only 9th graders/college, or an athlete missing info)
--   standard athletes, coaches, fans (they keep using the A/B/C tier only)
-- Stored in its own table so users can never write it; recomputed whenever the inputs change.

create table public.account_classes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  class text not null check (class in ('S','M','standard')),
  reason text,
  updated_at timestamptz not null default now()
);
alter table public.account_classes enable row level security;
create policy "own class read" on public.account_classes for select to authenticated using (user_id = (select auth.uid()));
create policy "admins read classes" on public.account_classes for select to authenticated using ((select public.is_admin()));
revoke all on public.account_classes from anon;
revoke insert, update, delete on public.account_classes from authenticated;

-- sophomore, junior or senior: the grade field if set, else the class year against the current school year (Aug-Jul)
create or replace function public.is_upper_class(p_grade text, p_grad_year int) returns boolean language sql stable as $$
  select case when p_grade is not null and p_grade in ('9','10','11','12') then p_grade in ('10','11','12')
    when p_grad_year is null then false
    else p_grad_year - (extract(year from now())::int + case when extract(month from now()) >= 8 then 1 else 0 end) between 0 and 2 end $$;

create or replace function public.compute_account_class(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles; contact boolean; any_kid boolean; upper_kid boolean; full_kid boolean; c text; r text;
begin
  select * into p from public.profiles where id = p_id;
  if not found then return; end if;
  if p.role is distinct from 'parent' then
    c := 'standard'; r := coalesce(p.role, 'no role');
  else
    contact   := coalesce(btrim(p.first_name), '') <> '' and coalesce(btrim(p.phone), '') <> '';
    any_kid   := exists (select 1 from public.athletes a where a.parent_id = p_id);
    upper_kid := exists (select 1 from public.athletes a where a.parent_id = p_id and public.is_upper_class(a.grade, a.grad_year));
    -- "complete" = the same fields the A+ rule (migration contacts_dream_schools_tier_aplus) requires for a parent's athlete
    full_kid  := exists (select 1 from public.athletes a where a.parent_id = p_id and public.is_upper_class(a.grade, a.grad_year)
                   and btrim(a.first_name) <> '' and a.last_name is not null and a.grad_year is not null and a.state is not null
                   and a.gender is not null and a.gpa is not null
                   and exists (select 1 from public.marks m where m.athlete_id = a.id));
    if contact and full_kid then c := 'S'; r := 'parent with a complete sophomore-senior athlete';
    else
      c := 'M';
      r := case when not any_kid then 'no athletes added yet'
                when not upper_kid then 'no sophomore, junior or senior athlete'
                when not full_kid then 'sophomore-senior athlete missing name, class year, state, Men/Women, GPA or a mark'
                else 'parent name or phone missing' end;
    end if;
  end if;
  insert into public.account_classes (user_id, class, reason, updated_at) values (p_id, c, r, now())
  on conflict (user_id) do update set class = excluded.class, reason = excluded.reason, updated_at = now()
  where account_classes.class is distinct from excluded.class or account_classes.reason is distinct from excluded.reason;
end $$;
revoke all on function public.compute_account_class(uuid) from public, anon, authenticated;

create or replace function public.reclass_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.compute_account_class(new.id); return null; end $$;
create or replace function public.reclass_athlete() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.compute_account_class(coalesce(new.parent_id, old.parent_id));
  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then perform public.compute_account_class(old.parent_id); end if;
  return null; end $$;
create or replace function public.reclass_mark() returns trigger language plpgsql security definer set search_path = public as $$
declare aid uuid := coalesce(new.athlete_id, old.athlete_id); pid uuid;
begin
  if aid is not null then select parent_id into pid from public.athletes where id = aid; if pid is not null then perform public.compute_account_class(pid); end if; end if;
  return null; end $$;
revoke all on function public.reclass_profile() from public, anon, authenticated;
revoke all on function public.reclass_athlete() from public, anon, authenticated;
revoke all on function public.reclass_mark() from public, anon, authenticated;

create trigger profiles_reclass after insert or update of role, first_name, phone on public.profiles for each row execute function public.reclass_profile();
create trigger athletes_reclass after insert or update or delete on public.athletes for each row execute function public.reclass_athlete();
create trigger marks_reclass after insert or update or delete on public.marks for each row execute function public.reclass_mark();

-- admin read: class per account (joins to admin_accounts() by id in the dashboard)
create or replace function public.admin_account_classes() returns table (id uuid, class text, reason text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return query select c.user_id, c.class, c.reason, c.updated_at from public.account_classes c;
end $$;
revoke all on function public.admin_account_classes() from public, anon;
grant execute on function public.admin_account_classes() to authenticated;

-- backfill every existing account
do $$ declare r record; begin for r in select id from public.profiles loop perform public.compute_account_class(r.id); end loop; end $$;

-- 007b: pin search_path (advisor warning)
alter function public.is_upper_class(text, int) set search_path = pg_catalog;
