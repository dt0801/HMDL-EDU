-- ============================================================
-- HMDL-edu — Triggers
-- ============================================================

-- ------------------------------------------------------------
-- Tự động tạo profile khi auth.users được tạo
-- Lấy full_name, role, department từ raw_user_meta_data
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Tự động cập nhật updated_at
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Khi exam_attempts submitted_at được set, tự cập nhật is_passed
-- ------------------------------------------------------------
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
