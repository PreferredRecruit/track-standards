-- Confirmation reminder (Ryan 2026-11-11: "send a reminder email to confirm after 24 hours of not confirming").
-- Every hour: anyone who signed up 24 to 72 hours ago and still hasn't confirmed gets ONE fresh confirmation email, through the
-- same Supabase resend endpoint the "Resend email" button uses (same template, a new link, so expired links are fixed too).
-- Transactional only (it finishes the sign-up they started); sent once per account, logged in confirm_reminders.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.confirm_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  request_id bigint,
  attempts smallint not null default 1
);
alter table public.confirm_reminders enable row level security;   -- no policies: server-side only

-- 2 sends every 2 minutes (Resend allows 10 a second; the first run sent 18 at once and 7 bounced off that limit).
-- A failed send comes back after 5 minutes, up to 3 attempts.
create or replace function public.send_confirm_reminders() returns integer
language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare u record; n int := 0; rid bigint;
begin
  for u in
    select au.id, au.email, coalesce(c.attempts, 0) att from auth.users au
    left join public.confirm_reminders c on c.user_id = au.id
    left join net._http_response r on r.id = c.request_id
    where au.email_confirmed_at is null and au.email is not null
      and au.created_at < now() - interval '24 hours' and au.created_at > now() - interval '72 hours'
      and (c.user_id is null or (r.status_code >= 400 and c.attempts < 3 and c.sent_at < now() - interval '5 minutes'))
    order by au.created_at limit 2
  loop
    select net.http_post(
      url := 'https://vtbrenadwivmiursebfp.supabase.co/auth/v1/resend?redirect_to=https%3A%2F%2Ftrackandfieldstandards.com%2Fonboarding',
      headers := jsonb_build_object('apikey', 'sb_publishable_Ym2-USDV80BCDbIMm6EoUQ_aPqqbIbJ', 'Content-Type', 'application/json'),
      body := jsonb_build_object('type', 'signup', 'email', u.email)) into rid;
    insert into public.confirm_reminders (user_id, request_id, attempts) values (u.id, rid, u.att + 1)
      on conflict (user_id) do update set request_id = excluded.request_id, attempts = excluded.attempts, sent_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.send_confirm_reminders() from public, anon, authenticated;

select cron.unschedule('confirm-reminders') where exists (select 1 from cron.job where jobname = 'confirm-reminders');
select cron.schedule('confirm-reminders', '*/2 * * * *', 'select public.send_confirm_reminders()');
