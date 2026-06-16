-- ============================================================
-- HMDL-edu - Production security hardening
-- ============================================================

-- Students must not be able to self-issue certificates. Certificate issuance
-- goes through guarded server routes/service role.
drop policy if exists "certificates_insert" on public.certificates;
create policy "certificates_insert_admin" on public.certificates
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "certificates_update_admin" on public.certificates;
create policy "certificates_update_admin" on public.certificates
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "certificates_delete_admin" on public.certificates;
create policy "certificates_delete_admin" on public.certificates
  for delete to authenticated
  using (public.is_admin());

-- Enrollment deletion is an admin action. Students can still view/update their
-- own progress through the existing policies, but cannot silently delete rows.
drop policy if exists "enrollments_delete_admin" on public.enrollments;
create policy "enrollments_delete_admin" on public.enrollments
  for delete to authenticated
  using (public.is_admin());

-- Lesson content is stored as <course_id>/<file>. Limit signed URL creation to
-- admins, owning instructors, or students enrolled in the course.
drop policy if exists "content_authenticated_read" on storage.objects;
create policy "content_course_member_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-content'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.courses c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = auth.uid()
      )
      or exists (
        select 1
        from public.enrollments e
        where e.course_id::text = (storage.foldername(name))[1]
          and e.student_id = auth.uid()
          and e.status in ('active', 'completed')
      )
    )
  );

drop policy if exists "content_instructor_write" on storage.objects;
create policy "content_instructor_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-content'
    and public.is_instructor_or_admin()
    and exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.instructor_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "content_instructor_update" on storage.objects;
create policy "content_instructor_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-content'
    and exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.instructor_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "content_instructor_delete" on storage.objects;
create policy "content_instructor_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-content'
    and exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.instructor_id = auth.uid() or public.is_admin())
    )
  );
