-- 020 Course library (Ryan 2026-11-12: "build the entire product on the platform"; course moves off Whop/Skool onto the site).
-- Tiers: lt27 = the $27 7-Day Roadmap (Premium accounts, comp, admins)
--        pb   = Preferred Recruit Playbook library (Playbook 1.0/2.0, Ultimate Guide, guest calls): admins + Playbook buyers (product 'pb')
-- Everyone signed in sees every title (locked items show a lock); lesson text and videos only reach accounts that unlock that tier.

-- upload secret (hash only; the value lives in the vault, course-upload.env)
insert into private.secrets (name, sha256) values ('course_upload', '5b65f003e98453b1f6ee1d9bfa17e6dad116862317e3f7d3c359a3319a961984')
  on conflict do nothing;

-- private bucket for lesson videos and files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course', 'course', false, 52428800, array['video/mp4', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create table if not exists premium.course_items (
  id text primary key,
  tier text not null check (tier in ('lt27', 'pb')),
  course text not null,            -- slug of the course (e.g. 7day, pb2, pb1)
  course_title text not null,
  course_idx int not null default 0,
  section text,                    -- group inside the course (e.g. "Email templates")
  idx int not null default 0,
  title text not null,
  kind text not null check (kind in ('video', 'text', 'tool')),
  summary text,                    -- one line shown even when locked
  body text,                       -- lesson text (markdown-lite), only for unlocked accounts
  link text,                       -- external tool link (e.g. tracker sheet), only for unlocked accounts
  video_path text,                 -- object name in bucket "course"
  video_secs int,
  soon boolean not null default false,
  updated_at timestamptz not null default now());
alter table premium.course_items enable row level security;  -- no policies: read only through the functions below

create or replace function public.course_access(t text) returns boolean
language sql stable security definer set search_path to 'public', 'premium' as $$
  select case
    when auth.uid() is null then false
    when t = 'lt27' then coalesce((select f.premium from public.premium_flags(auth.uid()) f), false)
    when t = 'pb' then coalesce((select f.admin from public.premium_flags(auth.uid()) f), false)
      or exists (select 1 from premium.entitlements e where e.user_id = auth.uid() and e.revoked_at is null and e.product = 'pb')
    else false end;
$$;
revoke all on function public.course_access(text) from public, anon;
grant execute on function public.course_access(text) to authenticated;

-- the catalog: every item with its lock state (no lesson text)
create or replace function public.course_catalog()
returns table(id text, tier text, course text, course_title text, course_idx int, section text, idx int, title text, kind text, summary text, video_secs int, soon boolean, unlocked boolean)
language sql stable security definer set search_path to 'public', 'premium' as $$
  with a as (select public.course_access('lt27') l, public.course_access('pb') p)
  select c.id, c.tier, c.course, c.course_title, c.course_idx, c.section, c.idx, c.title, c.kind, c.summary, c.video_secs, c.soon,
         case c.tier when 'lt27' then a.l else a.p end
  from premium.course_items c, a
  order by c.course_idx, c.idx;
$$;
revoke all on function public.course_catalog() from public, anon;
grant execute on function public.course_catalog() to authenticated;

-- one lesson's content, only when unlocked
create or replace function public.course_item(item text) returns jsonb
language plpgsql stable security definer set search_path to 'public', 'premium' as $$
declare c premium.course_items;
begin
  select * into c from premium.course_items where id = item;
  if not found then raise exception 'not found'; end if;
  if not public.course_access(c.tier) then raise exception 'locked'; end if;
  return jsonb_build_object('id', c.id, 'title', c.title, 'kind', c.kind, 'body', c.body, 'link', c.link, 'video_path', c.video_path, 'video_secs', c.video_secs, 'soon', c.soon);
end $$;
revoke all on function public.course_item(text) from public, anon;
grant execute on function public.course_item(text) to authenticated;

-- signed video links: an account can sign (read) a video only when it unlocks that lesson
drop policy if exists "course videos for owners" on storage.objects;
create policy "course videos for owners" on storage.objects for select to authenticated
  using (bucket_id = 'course' and exists (select 1 from premium.course_items c where c.video_path = storage.objects.name and public.course_access(c.tier)));

-- Playbook buyers can be granted with product 'pb'
create or replace function public.premium_grant(secret text, email text, order_id text, product text default 'lt27', bump boolean default false)
returns text language plpgsql security definer set search_path to 'public','premium','private' as $$
declare t uuid; em text := lower(trim(premium_grant.email)); oid text := trim(premium_grant.order_id); p text := coalesce(premium_grant.product, 'lt27');
begin
  if not private.secret_ok('premium_grant', secret) then raise exception 'not allowed'; end if;
  if p not in ('lt27','em17','comp','pb') then raise exception 'product not allowed'; end if;
  if coalesce(em, '') !~ '^\S+@\S+\.\S+$' or coalesce(oid, '') = '' then raise exception 'email and order_id required'; end if;
  insert into premium.entitlements as x (order_id, email, product, bump) values (oid, em, p, coalesce(premium_grant.bump, false) or p = 'em17')
    on conflict on constraint entitlements_order_id_key do update set bump = x.bump or excluded.bump, revoked_at = null
    returning x.claim_token into t;
  return 'https://trackandfieldstandards.com/premium?claim=' || t;
end $$;

-- content loader for the upload tool (service role only)
create or replace function public.course_upsert(secret text, items jsonb) returns int
language plpgsql security definer set search_path to 'public','premium','private' as $$
declare n int;
begin
  if not private.secret_ok('course_upload', secret) then raise exception 'not allowed'; end if;
  insert into premium.course_items (id, tier, course, course_title, course_idx, section, idx, title, kind, summary, body, link, video_path, video_secs, soon, updated_at)
  select x.id, x.tier, x.course, x.course_title, coalesce(x.course_idx, 0), x.section, coalesce(x.idx, 0), x.title, x.kind, x.summary, x.body, x.link, x.video_path, x.video_secs, coalesce(x.soon, false), now()
  from jsonb_to_recordset(items) as x(id text, tier text, course text, course_title text, course_idx int, section text, idx int, title text, kind text, summary text, body text, link text, video_path text, video_secs int, soon boolean)
  on conflict (id) do update set tier = excluded.tier, course = excluded.course, course_title = excluded.course_title, course_idx = excluded.course_idx,
    section = excluded.section, idx = excluded.idx, title = excluded.title, kind = excluded.kind, summary = excluded.summary, body = excluded.body,
    link = excluded.link, video_path = excluded.video_path, video_secs = excluded.video_secs, soon = excluded.soon, updated_at = now();
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.course_upsert(text, jsonb) from public;
grant execute on function public.course_upsert(text, jsonb) to anon, authenticated, service_role;  -- guarded by the course_upload secret

-- 020b: the storage policy runs as the viewer, so the lesson lookup goes through a security-definer check
create or replace function public.course_video_ok(obj text) returns boolean
language sql stable security definer set search_path to 'public', 'premium' as $$
  select exists (select 1 from premium.course_items c where c.video_path = obj and public.course_access(c.tier));
$$;
revoke all on function public.course_video_ok(text) from public, anon;
grant execute on function public.course_video_ok(text) to authenticated;
drop policy if exists "course videos for owners" on storage.objects;
create policy "course videos for owners" on storage.objects for select to authenticated
  using (bucket_id = 'course' and public.course_video_ok(name));
