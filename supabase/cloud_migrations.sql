-- ============================================================
-- HMDL-edu — Cloud migrations (manual run)
-- Dùng khi Supabase CLI không kết nối được Postgres (timeout/blocked port 5432).
--
-- Cách chạy:
--   Supabase Dashboard → SQL Editor → New query → paste file này → Run
-- ============================================================

-- 0001_init_schema.sql
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null check (role in ('admin','instructor','student')),
  department  text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_department on public.profiles(department);

create table if not exists public.courses (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  thumbnail_url       text,
  category            text,
  instructor_id       uuid references public.profiles(id) on delete set null,
  is_published        boolean not null default false,
  requires_enrollment boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_courses_instructor on public.courses(instructor_id);
create index if not exists idx_courses_published on public.courses(is_published);
create index if not exists idx_courses_category on public.courses(category);

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  title            text not null,
  description      text,
  type             text not null check (type in ('video','document','text')),
  content_url      text,
  duration_seconds int,
  sort_order       int not null default 0,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists idx_lessons_course on public.lessons(course_id);
create index if not exists idx_lessons_sort on public.lessons(course_id, sort_order);

create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  status       text not null default 'active' check (status in ('active','completed','dropped')),
  unique(student_id, course_id)
);

create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);

create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  watched_seconds int not null default 0,
  is_completed    boolean not null default false,
  last_watched_at timestamptz,
  unique(student_id, lesson_id)
);

create index if not exists idx_lesson_progress_student on public.lesson_progress(student_id);

create table if not exists public.exams (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  title            text not null,
  description      text,
  duration_minutes int not null default 60,
  passing_score    int not null default 70,
  max_attempts     int not null default 3,
  is_published     boolean not null default false,
  start_at         timestamptz,
  end_at           timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_exams_course on public.exams(course_id);

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references public.exams(id) on delete cascade,
  content     text not null,
  type        text not null default 'mcq' check (type in ('mcq','multi','true_false')),
  points      int not null default 1,
  sort_order  int not null default 0,
  explanation text
);

create index if not exists idx_questions_exam on public.questions(exam_id);

create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  content     text not null,
  is_correct  boolean not null default false,
  sort_order  int not null default 0
);

create index if not exists idx_answers_question on public.answers(question_id);

create table if not exists public.exam_attempts (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references public.exams(id) on delete cascade,
  student_id       uuid not null references public.profiles(id) on delete cascade,
  score            numeric(5,2),
  is_passed        boolean,
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  answers_snapshot jsonb
);

create index if not exists idx_exam_attempts_student on public.exam_attempts(student_id);
create index if not exists idx_exam_attempts_exam on public.exam_attempts(exam_id);

create table if not exists public.certificates (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  issued_at   timestamptz not null default now(),
  cert_number text unique not null default ('CERT-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 12)),
  unique(student_id, course_id)
);

create index if not exists idx_certificates_student on public.certificates(student_id);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  is_read    boolean not null default false,
  link       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, is_read);

-- 0004_triggers.sql (tạo profile khi tạo auth.user, updated_at, is_passed)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'department'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

create or replace function public.update_exam_attempt_passed()
returns trigger
language plpgsql
as $$
declare
  v_passing_score int;
begin
  if new.submitted_at is not null and new.score is not null then
    select passing_score into v_passing_score
    from public.exams where id = new.exam_id;

    new.is_passed := (new.score >= v_passing_score);
  end if;
  return new;
end;
$$;

drop trigger if exists set_exam_attempt_passed on public.exam_attempts;
create trigger set_exam_attempt_passed
  before insert or update on public.exam_attempts
  for each row execute function public.update_exam_attempt_passed();

-- 0002_rls_policies.sql
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_instructor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','instructor') and is_active
  );
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_instructor_or_admin() to authenticated;

alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.lessons         enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exams           enable row level security;
alter table public.questions       enable row level security;
alter table public.answers         enable row level security;
alter table public.exam_attempts   enable row level security;
alter table public.certificates    enable row level security;
alter table public.notifications   enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_select_active_for_lookup" on public.profiles;
create policy "profiles_select_active_for_lookup" on public.profiles
  for select to authenticated
  using (is_active = true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "courses_select_published_or_owner" on public.courses;
create policy "courses_select_published_or_owner" on public.courses
  for select to authenticated
  using (
    is_published = true
    or instructor_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "courses_insert_instructor" on public.courses;
create policy "courses_insert_instructor" on public.courses
  for insert to authenticated
  with check (public.is_instructor_or_admin() and (instructor_id = auth.uid() or public.is_admin()));

drop policy if exists "courses_update_owner_or_admin" on public.courses;
create policy "courses_update_owner_or_admin" on public.courses
  for update to authenticated
  using (instructor_id = auth.uid() or public.is_admin())
  with check (instructor_id = auth.uid() or public.is_admin());

drop policy if exists "courses_delete_owner_or_admin" on public.courses;
create policy "courses_delete_owner_or_admin" on public.courses
  for delete to authenticated
  using (instructor_id = auth.uid() or public.is_admin());

drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select" on public.lessons
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
        and (c.instructor_id = auth.uid() or (c.is_published and lessons.is_published))
    )
  );

drop policy if exists "lessons_modify_owner_or_admin" on public.lessons;
create policy "lessons_modify_owner_or_admin" on public.lessons
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select" on public.enrollments
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "enrollments_insert_self" on public.enrollments;
create policy "enrollments_insert_self" on public.enrollments
  for insert to authenticated
  with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_update_self_or_admin" on public.enrollments;
create policy "enrollments_update_self_or_admin" on public.enrollments
  for update to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_delete_admin" on public.enrollments;
create policy "enrollments_delete_admin" on public.enrollments
  for delete to authenticated
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists "lesson_progress_select" on public.lesson_progress;
create policy "lesson_progress_select" on public.lesson_progress
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_progress.lesson_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "lesson_progress_upsert_self" on public.lesson_progress;
create policy "lesson_progress_upsert_self" on public.lesson_progress
  for all to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "exams_select" on public.exams;
create policy "exams_select" on public.exams
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = exams.course_id and c.instructor_id = auth.uid()
    )
    or (
      is_published
      and exists (
        select 1 from public.enrollments e
        where e.course_id = exams.course_id and e.student_id = auth.uid()
      )
    )
  );

drop policy if exists "exams_modify_owner_or_admin" on public.exams;
create policy "exams_modify_owner_or_admin" on public.exams
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = exams.course_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = exams.course_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "questions_select" on public.questions;
create policy "questions_select" on public.questions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.exams e
      join public.courses c on c.id = e.course_id
      where e.id = questions.exam_id
        and (
          c.instructor_id = auth.uid()
          or (
            e.is_published
            and exists (
              select 1 from public.enrollments en
              where en.course_id = c.id and en.student_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "questions_modify_owner_or_admin" on public.questions;
create policy "questions_modify_owner_or_admin" on public.questions
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.exams e
      join public.courses c on c.id = e.course_id
      where e.id = questions.exam_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.exams e
      join public.courses c on c.id = e.course_id
      where e.id = questions.exam_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "answers_select" on public.answers;
create policy "answers_select" on public.answers
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      join public.courses c on c.id = e.course_id
      where q.id = answers.question_id
        and (
          c.instructor_id = auth.uid()
          or (
            e.is_published
            and exists (
              select 1 from public.enrollments en
              where en.course_id = c.id and en.student_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "answers_modify_owner_or_admin" on public.answers;
create policy "answers_modify_owner_or_admin" on public.answers
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      join public.courses c on c.id = e.course_id
      where q.id = answers.question_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      join public.courses c on c.id = e.course_id
      where q.id = answers.question_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "exam_attempts_select" on public.exam_attempts;
create policy "exam_attempts_select" on public.exam_attempts
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.exams e
      join public.courses c on c.id = e.course_id
      where e.id = exam_attempts.exam_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "exam_attempts_insert_self" on public.exam_attempts;
create policy "exam_attempts_insert_self" on public.exam_attempts
  for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists "exam_attempts_update_self" on public.exam_attempts;
create policy "exam_attempts_update_self" on public.exam_attempts
  for update to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "certificates_select" on public.certificates;
create policy "certificates_select" on public.certificates
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = certificates.course_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "certificates_insert" on public.certificates;
create policy "certificates_insert" on public.certificates
  for insert to authenticated
  with check (
    public.is_admin()
    or student_id = auth.uid()
  );

drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert to authenticated
  with check (public.is_admin() or user_id = auth.uid());

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 0003_storage.sql
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('course-thumbnails', 'course-thumbnails', true),
  ('course-content', 'course-content', false)
on conflict (id) do nothing;

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

-- 0006_departments.sql
create table if not exists public.departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  code       text unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists idx_departments_sort on public.departments(sort_order, name);
create index if not exists idx_profiles_department_id on public.profiles(department_id);

insert into public.departments (name, sort_order)
select distinct trim(department), 100
from public.profiles
where department is not null and trim(department) <> ''
on conflict (name) do nothing;

update public.profiles p
set department_id = d.id
from public.departments d
where p.department_id is null
  and p.department is not null
  and trim(p.department) = d.name;

create or replace function public.departments_before_delete_clear_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set department_id = null,
      department = null
  where department_id = old.id;
  return old;
end;
$$;

drop trigger if exists departments_before_delete_clear_profiles on public.departments;
create trigger departments_before_delete_clear_profiles
before delete on public.departments
for each row execute function public.departments_before_delete_clear_profiles();

create or replace function public.departments_after_update_sync_profile_text()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set department = new.name
  where department_id = new.id;
  return new;
end;
$$;

drop trigger if exists departments_after_update_sync_profile_text on public.departments;
create trigger departments_after_update_sync_profile_text
after update of name on public.departments
for each row
when (old.name is distinct from new.name)
execute function public.departments_after_update_sync_profile_text();

alter table public.departments enable row level security;

drop policy if exists "departments_select_authenticated" on public.departments;
create policy "departments_select_authenticated" on public.departments
  for select to authenticated
  using (true);

drop policy if exists "departments_admin_all" on public.departments;
create policy "departments_admin_all" on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 0008_profile_onboarding.sql (đồng bộ cloud)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text,
  add column if not exists profile_completed_at timestamptz;

comment on column public.profiles.phone is 'Số điện thoại liên hệ (profiles)';
comment on column public.profiles.profile_completed_at is 'null = chưa hoàn tất form hồ sơ lần đầu sau đăng nhập';

update public.profiles
set profile_completed_at = now()
where profile_completed_at is null;
