-- ============================================================
-- HMDL-edu - Zoom live sessions
-- ============================================================

create table if not exists public.live_sessions (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid not null references public.courses(id) on delete cascade,
  lesson_id          uuid references public.lessons(id) on delete set null,
  title              text not null,
  description        text,
  scheduled_start_at timestamptz not null,
  duration_minutes   int not null default 60 check (duration_minutes > 0),
  timezone           text not null default 'Asia/Ho_Chi_Minh',
  zoom_meeting_id    text not null unique,
  zoom_join_url      text not null,
  status             text not null default 'scheduled' check (status in ('scheduled', 'canceled')),
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.live_session_secrets (
  session_id       uuid primary key references public.live_sessions(id) on delete cascade,
  zoom_start_url   text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_live_sessions_course on public.live_sessions(course_id);
create index if not exists idx_live_sessions_lesson on public.live_sessions(lesson_id);
create index if not exists idx_live_sessions_start_at on public.live_sessions(scheduled_start_at);
create index if not exists idx_live_sessions_status on public.live_sessions(status);

create or replace function public.ensure_live_session_lesson_match()
returns trigger
language plpgsql
as $$
declare
  lesson_course_id uuid;
begin
  if new.lesson_id is null then
    return new;
  end if;

  select course_id
    into lesson_course_id
  from public.lessons
  where id = new.lesson_id;

  if lesson_course_id is null then
    raise exception 'Lesson % does not exist', new.lesson_id;
  end if;

  if lesson_course_id <> new.course_id then
    raise exception 'Lesson % does not belong to course %', new.lesson_id, new.course_id;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_live_session_lesson_match on public.live_sessions;
create trigger ensure_live_session_lesson_match
  before insert or update on public.live_sessions
  for each row execute function public.ensure_live_session_lesson_match();

drop trigger if exists set_live_sessions_updated_at on public.live_sessions;
create trigger set_live_sessions_updated_at
  before update on public.live_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists set_live_session_secrets_updated_at on public.live_session_secrets;
create trigger set_live_session_secrets_updated_at
  before update on public.live_session_secrets
  for each row execute function public.set_updated_at();

alter table public.live_sessions enable row level security;
alter table public.live_session_secrets enable row level security;

drop policy if exists "live_sessions_select" on public.live_sessions;
create policy "live_sessions_select" on public.live_sessions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      where c.id = live_sessions.course_id
        and c.instructor_id = auth.uid()
    )
    or (
      live_sessions.status = 'scheduled'
      and exists (
        select 1
        from public.enrollments e
        where e.course_id = live_sessions.course_id
          and e.student_id = auth.uid()
      )
    )
  );

drop policy if exists "live_sessions_modify_owner_or_admin" on public.live_sessions;
create policy "live_sessions_modify_owner_or_admin" on public.live_sessions
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      where c.id = live_sessions.course_id
        and c.instructor_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      where c.id = live_sessions.course_id
        and c.instructor_id = auth.uid()
    )
  );
