-- ============================================================
-- HMDL-edu — Storage buckets + policies
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('course-thumbnails', 'course-thumbnails', true),
  ('course-content', 'course-content', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- avatars: ai cũng đọc được, user upload avatar của mình
-- ------------------------------------------------------------
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_self_write" on storage.objects;
create policy "avatars_self_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_self_update" on storage.objects;
create policy "avatars_self_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_self_delete" on storage.objects;
create policy "avatars_self_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- course-thumbnails: public read, instructor/admin upload
-- ------------------------------------------------------------
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects
  for select to public
  using (bucket_id = 'course-thumbnails');

drop policy if exists "thumbnails_instructor_write" on storage.objects;
create policy "thumbnails_instructor_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-thumbnails'
    and public.is_instructor_or_admin()
  );

drop policy if exists "thumbnails_instructor_update" on storage.objects;
create policy "thumbnails_instructor_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and public.is_instructor_or_admin()
  );

drop policy if exists "thumbnails_instructor_delete" on storage.objects;
create policy "thumbnails_instructor_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and public.is_instructor_or_admin()
  );

-- ------------------------------------------------------------
-- course-content: chỉ user đã đăng nhập đọc được; instructor/admin ghi
-- ------------------------------------------------------------
drop policy if exists "content_authenticated_read" on storage.objects;
create policy "content_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'course-content');

drop policy if exists "content_instructor_write" on storage.objects;
create policy "content_instructor_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-content'
    and public.is_instructor_or_admin()
  );

drop policy if exists "content_instructor_update" on storage.objects;
create policy "content_instructor_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-content'
    and public.is_instructor_or_admin()
  );

drop policy if exists "content_instructor_delete" on storage.objects;
create policy "content_instructor_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-content'
    and public.is_instructor_or_admin()
  );
