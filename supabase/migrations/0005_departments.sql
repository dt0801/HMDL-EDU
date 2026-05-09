-- ============================================================
-- HMDL-edu — Bảng phòng ban + FK profiles.department_id
-- ============================================================

create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  code        text unique,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_departments_sort on public.departments(sort_order, name);

alter table public.profiles
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists idx_profiles_department_id on public.profiles(department_id);

-- Backfill phòng ban từ text cũ + gán FK khi khớp tên (trim)
insert into public.departments (name, sort_order)
select distinct trim(p.department), 0
from public.profiles p
where p.department is not null
  and trim(p.department) <> ''
on conflict (name) do nothing;

update public.profiles p
set department_id = d.id
from public.departments d
where trim(coalesce(p.department, '')) = d.name
  and trim(coalesce(p.department, '')) <> '';

-- Xóa phòng ban: xóa luôn text mirror để tránh hiển thị sai (trước khi xóa dòng departments)
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

-- Đổi tên phòng ban: đồng bộ text mirror trên profiles
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

-- ------------------------------------------------------------
-- RLS departments
-- ------------------------------------------------------------
alter table public.departments enable row level security;

drop policy if exists "departments_select_authenticated" on public.departments;
create policy "departments_select_authenticated" on public.departments
  for select to authenticated
  using (true);

drop policy if exists "departments_modify_admin" on public.departments;
create policy "departments_modify_admin" on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
