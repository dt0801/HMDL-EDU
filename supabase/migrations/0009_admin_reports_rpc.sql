create or replace function public.get_admin_report_summary()
returns table (
  total_students bigint,
  total_courses bigint,
  published_courses bigint,
  total_enrollments bigint,
  completed_enrollments bigint,
  average_score numeric,
  certificates_issued bigint
)
language sql
stable
as $$
  select
    (select count(*) from public.profiles where role = 'student') as total_students,
    (select count(*) from public.courses) as total_courses,
    (select count(*) from public.courses where is_published = true) as published_courses,
    (select count(*) from public.enrollments) as total_enrollments,
    (select count(*) from public.enrollments where status = 'completed') as completed_enrollments,
    coalesce(
      (select round(avg(score)::numeric, 1) from public.exam_attempts where score is not null),
      0
    ) as average_score,
    (select count(*) from public.certificates) as certificates_issued;
$$;

create or replace function public.get_top_courses(limit_count integer default 5)
returns table (
  course_id uuid,
  course_title text,
  enrollments_count bigint
)
language sql
stable
as $$
  select
    e.course_id,
    coalesce(c.title, '(Đã xóa)')::text as course_title,
    count(*)::bigint as enrollments_count
  from public.enrollments e
  left join public.courses c on c.id = e.course_id
  group by e.course_id, c.title
  order by count(*) desc, coalesce(c.title, '')
  limit greatest(limit_count, 0);
$$;

grant execute on function public.get_admin_report_summary() to authenticated;
grant execute on function public.get_top_courses(integer) to authenticated;
