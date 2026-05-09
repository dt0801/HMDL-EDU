-- ============================================================
-- HMDL-edu — Hồ sơ lần đầu: phone + đánh dấu đã hoàn tất
-- profile_completed_at null → user phải điền form onboarding
-- ============================================================

alter table public.profiles
  add column if not exists phone text,
  add column if not exists profile_completed_at timestamptz;

comment on column public.profiles.phone is 'Số điện thoại liên hệ (profiles)';
comment on column public.profiles.profile_completed_at is 'null = chưa hoàn tất form hồ sơ lần đầu sau đăng nhập';

-- Một lần khi áp migration: coi mọi profile hiện có đã hoàn tất (tránh chặn user cũ).
update public.profiles
set profile_completed_at = now()
where profile_completed_at is null;
