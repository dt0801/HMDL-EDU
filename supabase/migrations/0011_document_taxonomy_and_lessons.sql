-- ============================================================
-- HMDL-edu - Document taxonomy and lesson links
-- ============================================================

alter table public.course_documents
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null,
  add column if not exists document_kind text not null default 'reference'
    check (document_kind in ('procedure', 'template', 'slide', 'reference', 'policy', 'other'));

create index if not exists idx_course_documents_lesson on public.course_documents(lesson_id);
create index if not exists idx_course_documents_kind on public.course_documents(document_kind);

create or replace function public.ensure_course_document_lesson_match()
returns trigger
language plpgsql
as $$
declare
  v_lesson_course_id uuid;
begin
  if new.lesson_id is null then
    return new;
  end if;

  select course_id
    into v_lesson_course_id
  from public.lessons
  where id = new.lesson_id;

  if v_lesson_course_id is null then
    raise exception 'Lesson % does not exist', new.lesson_id;
  end if;

  if v_lesson_course_id <> new.course_id then
    raise exception 'Lesson % does not belong to course %', new.lesson_id, new.course_id;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_course_document_lesson_match on public.course_documents;
create trigger ensure_course_document_lesson_match
  before insert or update on public.course_documents
  for each row execute function public.ensure_course_document_lesson_match();
