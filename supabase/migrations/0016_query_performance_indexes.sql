-- Indexes for the dashboard and tab queries that run most often.

create index if not exists idx_notifications_user_created_at
on public.notifications(user_id, created_at desc);

create index if not exists idx_certificates_student_issued_at
on public.certificates(student_id, issued_at desc);

create index if not exists idx_certificates_course_issued_at
on public.certificates(course_id, issued_at desc);

create index if not exists idx_live_sessions_status_start
on public.live_sessions(status, scheduled_start_at);

create index if not exists idx_live_sessions_course_status_start
on public.live_sessions(course_id, status, scheduled_start_at);

create index if not exists idx_exams_course_created_at
on public.exams(course_id, created_at desc);

create index if not exists idx_course_documents_course_created_at
on public.course_documents(course_id, created_at desc);
