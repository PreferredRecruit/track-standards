-- Monthly standards update (Ryan 2026-11-08): educational newsletter to opted-in parents, one a month.
-- Every profile gets a private unsubscribe token; the link in each email calls email_unsubscribe(token) with no sign-in.
alter table public.profiles add column if not exists email_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_email_token_key on public.profiles (email_token);

-- RLS already limits each user to their own profile row, so a user can only ever see their own token.

create or replace function public.email_unsubscribe(t uuid) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  update public.profiles set email_updates = false where email_token = t and email_updates;
  get diagnostics n = row_count;
  return n > 0 or exists (select 1 from public.profiles where email_token = t);
end $$;
revoke all on function public.email_unsubscribe(uuid) from public;
grant execute on function public.email_unsubscribe(uuid) to anon, authenticated;
