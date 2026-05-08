-- ============================================================
-- HMDL-edu — Schema khởi tạo
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- profiles: mở rộng từ auth.users
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- courses
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- lessons
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- enrollments
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- lesson_progress
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- exams
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- questions
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- answers
-- ------------------------------------------------------------
create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  content     text not null,
  is_correct  boolean not null default false,
  sort_order  int not null default 0
);

create index if not exists idx_answers_question on public.answers(question_id);

-- ------------------------------------------------------------
-- exam_attempts
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- certificates
-- ------------------------------------------------------------
create table if not exists public.certificates (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  issued_at   timestamptz not null default now(),
  cert_number text unique not null default ('CERT-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 12)),
  unique(student_id, course_id)
);

create index if not exists idx_certificates_student on public.certificates(student_id);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
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
