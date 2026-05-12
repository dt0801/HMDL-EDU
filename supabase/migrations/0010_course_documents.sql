-- ============================================================
-- HMDL-edu - Course documents
-- ============================================================

create table if not exists public.course_documents (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses(id) on delete cascade,
  title           text not null,
  description     text,
  file_url        text not null,
  file_name       text not null,
  mime_type       text,
  file_size_bytes bigint,
  audience        text not null default 'both' check (audience in ('student', 'instructor', 'both')),
  is_published    boolean not null default true,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_course_documents_course on public.course_documents(course_id);
create index if not exists idx_course_documents_uploaded_by on public.course_documents(uploaded_by);
create index if not exists idx_course_documents_visibility on public.course_documents(course_id, is_published, audience);

alter table public.course_documents enable row level security;

drop policy if exists "course_documents_select" on public.course_documents;
create policy "course_documents_select" on public.course_documents
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      where c.id = course_documents.course_id
        and c.instructor_id = auth.uid()
    )
    or (
      is_published
      and audience in ('student', 'both')
      and exists (
        select 1
        from public.enrollments e
        where e.course_id = course_documents.course_id
          and e.student_id = auth.uid()
      )
    )
  );

drop policy if exists "course_documents_modify_owner_or_admin" on public.course_documents;
create policy "course_documents_modify_owner_or_admin" on public.course_documents
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      where c.id = course_documents.course_id
        and c.instructor_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      where c.id = course_documents.course_id
        and c.instructor_id = auth.uid()
    )
  );

drop trigger if exists set_course_documents_updated_at on public.course_documents;
create trigger set_course_documents_updated_at
  before update on public.course_documents
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('course-documents', 'course-documents', false)
on conflict (id) do nothing;

drop policy if exists "course_documents_storage_select" on storage.objects;
create policy "course_documents_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-documents'
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
        from public.course_documents d
        join public.enrollments e
          on e.course_id = d.course_id
         and e.student_id = auth.uid()
        where d.file_url = name
          and d.is_published
          and d.audience in ('student', 'both')
      )
    )
  );

drop policy if exists "course_documents_storage_insert" on storage.objects;
create policy "course_documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-documents'
    and public.is_instructor_or_admin()
    and exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.instructor_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "course_documents_storage_update" on storage.objects;
create policy "course_documents_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-documents'
    and exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.instructor_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "course_documents_storage_delete" on storage.objects;
create policy "course_documents_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-documents'
    and exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.instructor_id = auth.uid() or public.is_admin())
    )
  );
