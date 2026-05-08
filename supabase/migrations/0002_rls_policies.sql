-- ============================================================
-- HMDL-edu — RLS Policies
-- Helper functions tránh RLS recursion khi check role.
-- ============================================================

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

-- ------------------------------------------------------------
-- Bật RLS toàn bộ
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- courses
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- lessons
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- enrollments
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- lesson_progress
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- exams
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- questions
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- answers
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- exam_attempts
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- certificates
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
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
