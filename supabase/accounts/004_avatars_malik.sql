-- 004/005 (Ryan 2026-10-19): Malik admin, profile photos (private bucket), high school; admin_accounts() v2 adds high_school + avatar_path.
insert into public.admin_emails (email, name) values ('coachmalik@thepreferredrecruit.com', 'Malik Metivier') on conflict do nothing;
alter table public.profiles add column avatar_path text check (char_length(avatar_path) <= 200), add column high_school text check (char_length(high_school) <= 100);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "avatar owner read"   on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar owner insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar owner update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar owner delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar admin read"   on storage.objects for select to authenticated using (bucket_id = 'avatars' and (select public.is_admin()));
-- admin_accounts() v2: see migration 005 in Supabase (same as 003 plus high_school, avatar_path).
