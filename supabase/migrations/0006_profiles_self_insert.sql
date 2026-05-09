-- ============================================================
-- HMDL-edu — Cho phép user tự tạo profile (student)
-- Mục tiêu: tránh trường hợp auth.users có nhưng profiles chưa được tạo (do trigger/migration timing).
-- ============================================================

-- profiles: user tự insert profile của chính mình (role bắt buộc = 'student')
drop policy if exists "profiles_insert_self_student" on public.profiles;
create policy "profiles_insert_self_student" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'student'
    and is_active = true
  );
