-- Standards-change emails (Ryan 2026-11-07: "opt in for sure if standards change but ... only do one email a month for now").
-- Parents opt in on their own; athletes never get these (no automated emails to athletes). Off by default.
alter table public.profiles
  add column if not exists email_updates boolean not null default false,
  add column if not exists email_updates_at timestamptz,
  add column if not exists email_last_sent_at timestamptz;   -- set by the monthly sender only; one email a month at most

create or replace function public.email_updates_stamp() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.role is distinct from 'parent' then new.email_updates := false; end if;
  if new.email_updates and new.email_updates_at is null then new.email_updates_at := now(); end if;
  if not new.email_updates then new.email_updates_at := null; end if;
  if current_user in ('authenticated', 'anon') then
    new.email_last_sent_at := case when tg_op = 'INSERT' then null else old.email_last_sent_at end;
  end if;
  return new;
end $$;

drop trigger if exists email_updates_stamp on public.profiles;
create trigger email_updates_stamp before insert or update on public.profiles
  for each row execute function public.email_updates_stamp();
