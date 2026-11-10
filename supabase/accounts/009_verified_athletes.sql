-- 009 (Ryan 2026-11-07): verified college athlete accounts, profile customization, reports, review queues.
-- Runs in the track-standards-accounts project (vtbrenadwivmiursebfp), never TPR.
-- Identity rule: a code sent to an address on the athlete's school domain proves they are at the school; the part before the @ must
-- also match the athlete's name (and no teammate in our data shares last name + first initial). Anything else waits for a human
-- review (an admin checks the address in the school's public directory). No ID documents are ever collected.
-- Clients never write claims, verified status or moderation status: the athlete-claim function and admin functions do.

create table public.claimable_athletes (
  tfrrs_id   text primary key check (tfrrs_id ~ '^[0-9]{3,12}$'),
  name       text not null,
  team       text not null,
  school     text,
  domains    text,                       -- space-separated school email domains (IPEDS + hand-checked), subdomains allowed
  ambiguous  boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.claimable_athletes enable row level security;   -- server only

create table public.athlete_claims (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  tfrrs_id      text not null references public.claimable_athletes(tfrrs_id),
  school_email  text not null check (char_length(school_email) <= 200),
  name_match    boolean not null default false,
  code_hash     text,
  code_expires  timestamptz,
  attempts      int not null default 0,
  sends         int not null default 0,
  last_sent_at  timestamptz,
  status        text not null default 'code_sent' check (status in ('code_sent','pending_review','verified','rejected','revoked')),
  note          text check (char_length(note) <= 300),
  reviewed_by   text,
  created_at    timestamptz not null default now(),
  email_ok_at   timestamptz,
  verified_at   timestamptz
);
create unique index athlete_claims_one_verified_athlete on public.athlete_claims (tfrrs_id) where status = 'verified';
create unique index athlete_claims_one_per_user on public.athlete_claims (user_id) where status in ('verified','pending_review');
create unique index athlete_claims_one_per_email on public.athlete_claims (lower(school_email)) where status in ('verified','pending_review');
create index athlete_claims_user on public.athlete_claims (user_id, created_at desc);
alter table public.athlete_claims enable row level security;       -- server only (holds the school email and code hash)

create table public.athlete_pages (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  tfrrs_id          text not null unique references public.claimable_athletes(tfrrs_id),
  show_college      boolean not null default true,
  show_high_school  boolean not null default false,
  show_home_state   boolean not null default false,
  show_class        boolean not null default true,
  show_instagram    boolean not null default false,
  show_video        boolean not null default true,
  high_school       text check (char_length(high_school) <= 100),
  home_state        text check (home_state ~ '^[A-Z]{2}$'),
  instagram         text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  video_url         text check (char_length(video_url) <= 300 and video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be|hudl\.com)/'),
  header_preset     text not null default 'violet' check (header_preset in ('violet','track','night','gold','teal','ink','ember','light')),
  header_upload     text check (char_length(header_upload) <= 200),   -- private avatars/<uid>/... (owner writes)
  photo_upload      text check (char_length(photo_upload) <= 200),
  header_status     text not null default 'none' check (header_status in ('none','pending','approved','review','rejected')),
  photo_status      text not null default 'none' check (photo_status in ('none','pending','approved','review','rejected')),
  header_public     text,                                              -- public URL, set by moderation only
  photo_public      text,
  header_score      real,
  photo_score       real,
  updated_at        timestamptz not null default now(),
  check (header_upload is null or header_upload like user_id::text || '/%'),
  check (photo_upload  is null or photo_upload  like user_id::text || '/%')
);
alter table public.athlete_pages enable row level security;
create policy "athlete page owner read"   on public.athlete_pages for select to authenticated using (user_id = (select auth.uid()));
create policy "athlete page owner update" on public.athlete_pages for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.athlete_pages from anon, authenticated;
grant select on public.athlete_pages to authenticated;
grant update (show_college, show_high_school, show_home_state, show_class, show_instagram, show_video, high_school, home_state,
              instagram, video_url, header_preset, header_upload, photo_upload) on public.athlete_pages to authenticated;

-- A new upload is hidden until the filter approves it; removing an upload clears it at once.
create or replace function public.athlete_pages_touch() returns trigger language plpgsql set search_path = public as $$
begin
  if new.header_upload is distinct from old.header_upload then
    new.header_status := case when new.header_upload is null then 'none' else 'pending' end; new.header_public := null; new.header_score := null;
  end if;
  if new.photo_upload is distinct from old.photo_upload then
    new.photo_status := case when new.photo_upload is null then 'none' else 'pending' end; new.photo_public := null; new.photo_score := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger athlete_pages_touch before update on public.athlete_pages for each row execute function public.athlete_pages_touch();

-- Public view of verified athletes: hidden fields never leave the database.
create or replace function public.verified_athletes()
returns table (tfrrs_id text, college text, class_shown boolean, high_school text, home_state text, instagram text, video_url text,
               header_preset text, header text, photo text)
language sql stable security definer set search_path = public as $$
  select p.tfrrs_id,
         case when p.show_college then a.team end,
         p.show_class,
         case when p.show_high_school then p.high_school end,
         case when p.show_home_state then p.home_state end,
         case when p.show_instagram then p.instagram end,
         case when p.show_video then p.video_url end,
         p.header_preset,
         case when p.header_status = 'approved' then p.header_public end,
         case when p.photo_status = 'approved' then p.photo_public end
  from public.athlete_pages p
  join public.claimable_athletes a using (tfrrs_id)
  where exists (select 1 from public.athlete_claims c where c.user_id = p.user_id and c.tfrrs_id = p.tfrrs_id and c.status = 'verified');
$$;
revoke all on function public.verified_athletes() from public;
grant execute on function public.verified_athletes() to anon, authenticated;

-- "Not you?" and photo reports from the public pages (no free text; 5 per browser per day).
create table public.athlete_reports (
  id         bigserial primary key,
  tfrrs_id   text not null,
  reason     text not null check (reason in ('not_me','photo','other')),
  sid        text check (char_length(sid) <= 64),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.athlete_reports enable row level security;
create or replace function public.report_athlete(p_tfrrs_id text, p_reason text, p_sid text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_reason not in ('not_me','photo','other') or p_tfrrs_id !~ '^[0-9]{3,12}$' then return false; end if;
  if (select count(*) from public.athlete_reports where sid = p_sid and created_at > now() - interval '1 day') >= 5 then return false; end if;
  insert into public.athlete_reports (tfrrs_id, reason, sid) values (p_tfrrs_id, p_reason, left(p_sid, 64));
  return true;
end $$;
revoke all on function public.report_athlete(text, text, text) from public;
grant execute on function public.report_athlete(text, text, text) to anon, authenticated;

-- Admin review queues (admins = public.admin_emails, checked by public.is_admin()).
create or replace function public.admin_athlete_queue()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'claims', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', a.name, 'team', a.team, 'tfrrs_id', c.tfrrs_id,
        'email', c.school_email, 'name_match', c.name_match, 'ambiguous', a.ambiguous, 'created_at', c.created_at) order by c.created_at)
      from public.athlete_claims c join public.claimable_athletes a using (tfrrs_id) where c.status = 'pending_review'), '[]'),
    'photos', coalesce((select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'tfrrs_id', p.tfrrs_id, 'kind', k.kind, 'path', k.path, 'score', k.score))
      from public.athlete_pages p
      cross join lateral (values ('header', p.header_upload, p.header_status, p.header_score), ('photo', p.photo_upload, p.photo_status, p.photo_score)) k(kind, path, st, score)
      where k.st = 'review'), '[]'),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'tfrrs_id', r.tfrrs_id, 'reason', r.reason, 'created_at', r.created_at) order by r.created_at)
      from public.athlete_reports r where r.handled_at is null), '[]'));
end $$;
revoke all on function public.admin_athlete_queue() from public;
grant execute on function public.admin_athlete_queue() to authenticated;

create or replace function public.admin_review_claim(p_id bigint, p_approve boolean, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare c public.athlete_claims; me text := (select email from auth.users where id = auth.uid());
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into c from public.athlete_claims where id = p_id for update;
  if c.id is null or c.status not in ('pending_review','verified') then return 'not found'; end if;
  if p_approve and c.status = 'pending_review' then
    update public.athlete_claims set status = 'verified', verified_at = now(), reviewed_by = me, note = left(p_note, 300) where id = p_id;
    insert into public.athlete_pages (user_id, tfrrs_id) values (c.user_id, c.tfrrs_id) on conflict (user_id) do nothing;
    return 'verified';
  elsif not p_approve then
    update public.athlete_claims set status = case when status = 'verified' then 'revoked' else 'rejected' end, reviewed_by = me, note = left(p_note, 300) where id = p_id;
    delete from public.athlete_pages where user_id = c.user_id and tfrrs_id = c.tfrrs_id;
    return 'removed';
  end if;
  return 'unchanged';
end $$;
revoke all on function public.admin_review_claim(bigint, boolean, text) from public;
grant execute on function public.admin_review_claim(bigint, boolean, text) to authenticated;

create or replace function public.admin_review_photo(p_user uuid, p_kind text, p_approve boolean)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  -- approve = send back to the filter job as an admin-cleared image (it publishes it); reject = hide and clear the upload
  if p_kind = 'header' then
    update public.athlete_pages set header_status = case when p_approve then 'pending' else 'rejected' end,
      header_score = case when p_approve then -1 else header_score end where user_id = p_user and header_status = 'review';
  elsif p_kind = 'photo' then
    update public.athlete_pages set photo_status = case when p_approve then 'pending' else 'rejected' end,
      photo_score = case when p_approve then -1 else photo_score end where user_id = p_user and photo_status = 'review';
  end if;
  return 'ok';
end $$;
revoke all on function public.admin_review_photo(uuid, text, boolean) from public;
grant execute on function public.admin_review_photo(uuid, text, boolean) to authenticated;

create or replace function public.admin_handle_report(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.athlete_reports set handled_at = now() where id = p_id;
end $$;
revoke all on function public.admin_handle_report(bigint) from public;
grant execute on function public.admin_handle_report(bigint) to authenticated;

-- Public bucket for approved images only (written by the moderation job with the service key; nobody else can write).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('athlete-public', 'athlete-public', true, 1048576, array['image/jpeg']) on conflict (id) do nothing;
