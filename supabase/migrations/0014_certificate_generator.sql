-- ============================================================
-- HMDL-edu - Certificate template generator
-- ============================================================

create table if not exists public.certificate_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  course_id   uuid references public.courses(id) on delete set null,
  canvas_json jsonb not null,
  width       integer not null default 1320,
  height      integer not null default 934,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_certificate_templates_course on public.certificate_templates(course_id);
create index if not exists idx_certificate_templates_active on public.certificate_templates(is_active, created_at desc);

alter table public.certificates
  add column if not exists template_id uuid references public.certificate_templates(id) on delete set null,
  add column if not exists certificate_code text,
  add column if not exists pdf_url text,
  add column if not exists image_url text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text;

update public.certificates
set certificate_code = cert_number
where certificate_code is null;

alter table public.certificates
  alter column certificate_code set default ('CERT-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 12));

create unique index if not exists idx_certificates_certificate_code
  on public.certificates(certificate_code)
  where certificate_code is not null;

create index if not exists idx_certificates_template on public.certificates(template_id);

alter table public.certificate_templates enable row level security;

drop policy if exists "certificate_templates_select" on public.certificate_templates;
create policy "certificate_templates_select" on public.certificate_templates
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      where c.id = certificate_templates.course_id
        and c.instructor_id = auth.uid()
    )
    or exists (
      select 1
      from public.certificates cert
      where cert.template_id = certificate_templates.id
        and cert.student_id = auth.uid()
    )
  );

drop policy if exists "certificate_templates_insert_admin" on public.certificate_templates;
create policy "certificate_templates_insert_admin" on public.certificate_templates
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "certificate_templates_update_admin" on public.certificate_templates;
create policy "certificate_templates_update_admin" on public.certificate_templates
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "certificate_templates_delete_admin" on public.certificate_templates;
create policy "certificate_templates_delete_admin" on public.certificate_templates
  for delete to authenticated
  using (public.is_admin());

