-- ============================================================
-- HMDL-edu — Seed data demo
-- Tài khoản demo (mật khẩu: HMDL@2026):
--   admin@hmdl.vn       → admin
--   bs.minh@hmdl.vn     → instructor (BS Lê Văn Minh)
--   bs.hoa@hmdl.vn      → instructor (BS Trần Thị Hòa)
--   dd.lan@hmdl.vn      → student
--   dd.tuan@hmdl.vn     → student
--   bs.hoang@hmdl.vn    → student
--   ktv.thao@hmdl.vn    → student
--   dd.linh@hmdl.vn     → student
-- ============================================================

-- Helper: tạo user qua auth.users + identities (dùng được với supabase local)
do $$
declare
  v_admin_id      uuid := '11111111-1111-1111-1111-111111111111';
  v_minh_id       uuid := '22222222-2222-2222-2222-222222222222';
  v_hoa_id        uuid := '33333333-3333-3333-3333-333333333333';
  v_lan_id        uuid := '44444444-4444-4444-4444-444444444444';
  v_tuan_id       uuid := '55555555-5555-5555-5555-555555555555';
  v_hoang_id      uuid := '66666666-6666-6666-6666-666666666666';
  v_thao_id       uuid := '77777777-7777-7777-7777-777777777777';
  v_linh_id       uuid := '88888888-8888-8888-8888-888888888888';
  v_password_hash text := crypt('HMDL@2026', gen_salt('bf'));
begin
  -- auth.users
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, created_at, updated_at)
  values
    (v_admin_id,  '00000000-0000-0000-0000-000000000000', 'admin@hmdl.vn',    v_password_hash, now(), jsonb_build_object('full_name','Quản trị viên','role','admin','department','PHÒNG CÔNG NGHỆ THÔNG TIN'), 'authenticated','authenticated', now(), now()),
    (v_minh_id,   '00000000-0000-0000-0000-000000000000', 'bs.minh@hmdl.vn',  v_password_hash, now(), jsonb_build_object('full_name','BS. Lê Văn Minh','role','instructor','department','KHOA NỘI 1'), 'authenticated','authenticated', now(), now()),
    (v_hoa_id,    '00000000-0000-0000-0000-000000000000', 'bs.hoa@hmdl.vn',   v_password_hash, now(), jsonb_build_object('full_name','BS. Trần Thị Hòa','role','instructor','department','KHOA HỒI SỨC'), 'authenticated','authenticated', now(), now()),
    (v_lan_id,    '00000000-0000-0000-0000-000000000000', 'dd.lan@hmdl.vn',   v_password_hash, now(), jsonb_build_object('full_name','ĐD. Nguyễn Thị Lan','role','student','department','KHOA NỘI 1'), 'authenticated','authenticated', now(), now()),
    (v_tuan_id,   '00000000-0000-0000-0000-000000000000', 'dd.tuan@hmdl.vn',  v_password_hash, now(), jsonb_build_object('full_name','ĐD. Phạm Văn Tuấn','role','student','department','KHOA CẤP CỨU'), 'authenticated','authenticated', now(), now()),
    (v_hoang_id,  '00000000-0000-0000-0000-000000000000', 'bs.hoang@hmdl.vn', v_password_hash, now(), jsonb_build_object('full_name','BS. Đỗ Quang Hoàng','role','student','department','KHOA NỘI 2'), 'authenticated','authenticated', now(), now()),
    (v_thao_id,   '00000000-0000-0000-0000-000000000000', 'ktv.thao@hmdl.vn', v_password_hash, now(), jsonb_build_object('full_name','KTV. Bùi Thu Thảo','role','student','department','KHOA CHẨN ĐOÁN HÌNH ẢNH'), 'authenticated','authenticated', now(), now()),
    (v_linh_id,   '00000000-0000-0000-0000-000000000000', 'dd.linh@hmdl.vn',  v_password_hash, now(), jsonb_build_object('full_name','ĐD. Vũ Thùy Linh','role','student','department','KHOA HỒI SỨC'), 'authenticated','authenticated', now(), now())
  on conflict (id) do nothing;

  -- auth.identities (yêu cầu cho login bằng email/password)
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), v_admin_id,  jsonb_build_object('sub', v_admin_id::text,  'email','admin@hmdl.vn'),    'email', v_admin_id::text,  now(), now(), now()),
    (gen_random_uuid(), v_minh_id,   jsonb_build_object('sub', v_minh_id::text,   'email','bs.minh@hmdl.vn'),  'email', v_minh_id::text,   now(), now(), now()),
    (gen_random_uuid(), v_hoa_id,    jsonb_build_object('sub', v_hoa_id::text,    'email','bs.hoa@hmdl.vn'),   'email', v_hoa_id::text,    now(), now(), now()),
    (gen_random_uuid(), v_lan_id,    jsonb_build_object('sub', v_lan_id::text,    'email','dd.lan@hmdl.vn'),   'email', v_lan_id::text,    now(), now(), now()),
    (gen_random_uuid(), v_tuan_id,   jsonb_build_object('sub', v_tuan_id::text,   'email','dd.tuan@hmdl.vn'),  'email', v_tuan_id::text,   now(), now(), now()),
    (gen_random_uuid(), v_hoang_id,  jsonb_build_object('sub', v_hoang_id::text,  'email','bs.hoang@hmdl.vn'), 'email', v_hoang_id::text,  now(), now(), now()),
    (gen_random_uuid(), v_thao_id,   jsonb_build_object('sub', v_thao_id::text,   'email','ktv.thao@hmdl.vn'), 'email', v_thao_id::text,   now(), now(), now()),
    (gen_random_uuid(), v_linh_id,   jsonb_build_object('sub', v_linh_id::text,   'email','dd.linh@hmdl.vn'),  'email', v_linh_id::text,   now(), now(), now())
  on conflict do nothing;
end;
$$;

-- ------------------------------------------------------------
-- Khoa / phòng ban theo cây kho
-- ------------------------------------------------------------
insert into public.departments (name, sort_order)
values
  ('PHÒNG HÀNH CHÍNH QUẢN TRỊ', 10),
  ('BẢO VỆ', 20),
  ('NGOẠI CẢNH', 30),
  ('TỔ LÁI XE', 40),
  ('VĂN PHÒNG HÀNH CHÍNH', 50),
  ('PHÒNG KẾ TOÁN & THUẾ', 60),
  ('PHÒNG NHÂN SỰ', 70),
  ('PHÒNG KINH DOANH', 80),
  ('PHÒNG MARKETING', 90),
  ('PHÒNG CHĂM SÓC KHÁCH HÀNG', 100),
  ('KHOA KHÁM BỆNH', 110),
  ('KHOA CHẨN ĐOÁN HÌNH ẢNH', 120),
  ('PHÒNG SIÊU ÂM', 130),
  ('PHÒNG NỘI SOI TIÊU HÓA', 140),
  ('PHÒNG X-QUANG', 150),
  ('PHÒNG ĐIỆN TIM', 160),
  ('PHÒNG CT', 170),
  ('KHOA CẤP CỨU', 180),
  ('KHOA NGOẠI', 190),
  ('KHOA NỘI 1', 200),
  ('KHOA SẢN', 210),
  ('KHOA NHI', 220),
  ('PHÒNG CÔNG NGHỆ THÔNG TIN', 230),
  ('BAN GIÁM ĐỐC BỆNH VIỆN', 240),
  ('PHÒNG KẾ HOẠCH TỔNG HỢP', 250),
  ('PHÒNG MUA HÀNG', 260),
  ('PHÒNG THIẾT BỊ Y TẾ', 270),
  ('KHOA DƯỢC', 280),
  ('KIỂM SOÁT NHIỄM KHUẨN', 290),
  ('KHOA PHẪU THUẬT - GÂY MÊ HỒI SỨC', 300),
  ('KHOA XÉT NGHIỆM', 310),
  ('PHÒNG QUẢN LÝ CHUYÊN MÔN ĐIỀU DƯỠNG, NHS, KTV', 320),
  ('THU NGÂN', 330),
  ('PHÒNG KẾ TOÁN', 340),
  ('HỘ LÝ', 350),
  ('BỘ PHẬN BHYT', 360),
  ('KHOA HỒI SỨC', 370),
  ('KHOA NỘI 2', 380),
  ('KHOA Y HỌC CỔ TRUYỀN & PHỤC HỒI CHỨC NĂNG', 390),
  ('KHOA DINH DƯỠNG', 400),
  ('QUẢN LÝ CƠ SỞ VẬT CHẤT', 410),
  ('BẢO TRÌ', 420),
  ('PHÒNG QUẢN LÝ CHẤT LƯỢNG', 430)
on conflict (name) do update
set
  sort_order = excluded.sort_order;

update public.profiles p
set department_id = d.id
from public.departments d
where p.department = d.name;

-- Sau reset DB: coi mọi tài khoản seed đã hoàn tất onboarding (cột 0008_profile_onboarding.sql).
update public.profiles
set profile_completed_at = coalesce(profile_completed_at, now())
where profile_completed_at is null;

-- ------------------------------------------------------------
-- Khóa học mẫu
-- ------------------------------------------------------------
insert into public.courses (id, title, description, category, instructor_id, is_published, requires_enrollment)
values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   'Hồi sức tim phổi cơ bản (BLS)',
   'Khóa đào tạo cập nhật quy trình BLS theo guideline AHA mới nhất, áp dụng cho toàn bộ nhân viên y tế.',
   'Tim mạch',
   '22222222-2222-2222-2222-222222222222',
   true, true),
  ('aaaaaaa1-0000-0000-0000-000000000002',
   'Kiểm soát nhiễm khuẩn bệnh viện',
   'Quy trình rửa tay, vô khuẩn dụng cụ và phòng ngừa nhiễm khuẩn chéo trong môi trường lâm sàng.',
   'Kiểm soát nhiễm khuẩn',
   '33333333-3333-3333-3333-333333333333',
   true, true),
  ('aaaaaaa1-0000-0000-0000-000000000003',
   'An toàn người bệnh và sai sót y khoa',
   'Nhận diện - báo cáo - phòng ngừa các sự cố y khoa thường gặp.',
   'An toàn người bệnh',
   '22222222-2222-2222-2222-222222222222',
   false, true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Bài học mẫu cho khóa BLS
-- ------------------------------------------------------------
insert into public.lessons (id, course_id, title, type, content_url, duration_seconds, sort_order, is_published)
values
  ('bbbbbbb1-0000-0000-0000-000000000001',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'Bài 1: Tổng quan BLS và chuỗi sống còn',
   'video',
   'https://www.w3schools.com/html/mov_bbb.mp4',
   480, 1, true),
  ('bbbbbbb1-0000-0000-0000-000000000002',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'Bài 2: Kỹ thuật ép tim ngoài lồng ngực',
   'video',
   'https://www.w3schools.com/html/mov_bbb.mp4',
   600, 2, true),
  ('bbbbbbb1-0000-0000-0000-000000000003',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'Bài 3: Sử dụng AED',
   'video',
   'https://www.w3schools.com/html/mov_bbb.mp4',
   420, 3, true),
  ('bbbbbbb1-0000-0000-0000-000000000004',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'Tài liệu tham khảo: AHA Guidelines 2020',
   'document',
   'https://cprguidelines.eu/sites/573c777f5e61585a053d7ba5/content_entry573c77e35e61585a053d7baf/5e2a6c85a7c01b1a420d7c87/files/Resuscitation-2015-Section-2-EPALS.pdf',
   null, 4, true)
on conflict (id) do nothing;

-- Bài học cho khóa kiểm soát nhiễm khuẩn
insert into public.lessons (id, course_id, title, type, content_url, duration_seconds, sort_order, is_published)
values
  ('bbbbbbb2-0000-0000-0000-000000000001',
   'aaaaaaa1-0000-0000-0000-000000000002',
   'Bài 1: 5 thời điểm rửa tay theo WHO',
   'video',
   'https://www.w3schools.com/html/mov_bbb.mp4',
   360, 1, true),
  ('bbbbbbb2-0000-0000-0000-000000000002',
   'aaaaaaa1-0000-0000-0000-000000000002',
   'Bài 2: Sử dụng phương tiện phòng hộ cá nhân (PPE)',
   'video',
   'https://www.w3schools.com/html/mov_bbb.mp4',
   540, 2, true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Đăng ký mẫu
-- ------------------------------------------------------------
insert into public.enrollments (student_id, course_id, status)
values
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaa1-0000-0000-0000-000000000001', 'active'),
  ('55555555-5555-5555-5555-555555555555', 'aaaaaaa1-0000-0000-0000-000000000001', 'active'),
  ('66666666-6666-6666-6666-666666666666', 'aaaaaaa1-0000-0000-0000-000000000001', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaa1-0000-0000-0000-000000000002', 'active'),
  ('77777777-7777-7777-7777-777777777777', 'aaaaaaa1-0000-0000-0000-000000000002', 'active'),
  ('88888888-8888-8888-8888-888888888888', 'aaaaaaa1-0000-0000-0000-000000000002', 'completed')
on conflict (student_id, course_id) do nothing;

-- ------------------------------------------------------------
-- Đề thi mẫu cho khóa BLS
-- ------------------------------------------------------------
insert into public.exams (id, course_id, title, description, duration_minutes, passing_score, max_attempts, is_published)
values
  ('ccccccc1-0000-0000-0000-000000000001',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'Kiểm tra cuối khóa BLS',
   'Đề kiểm tra 5 câu MCQ - thời gian 15 phút - đạt 70%.',
   15, 70, 3, true)
on conflict (id) do nothing;

-- 5 câu hỏi mẫu
insert into public.questions (id, exam_id, content, type, points, sort_order, explanation)
values
  ('ddddddd1-0000-0000-0000-000000000001',
   'ccccccc1-0000-0000-0000-000000000001',
   'Tần số ép tim khuyến cáo cho người lớn theo guideline AHA là?',
   'mcq', 1, 1,
   'Tần số 100-120 lần/phút giúp duy trì tưới máu não và mạch vành tối ưu.'),
  ('ddddddd1-0000-0000-0000-000000000002',
   'ccccccc1-0000-0000-0000-000000000001',
   'Tỷ lệ ép tim/thông khí ở người lớn (1 người cứu) là?',
   'mcq', 1, 2,
   'Tỷ lệ 30:2 áp dụng cho cả 1 và 2 người cứu khi chưa đặt nội khí quản.'),
  ('ddddddd1-0000-0000-0000-000000000003',
   'ccccccc1-0000-0000-0000-000000000001',
   'Độ sâu ép tim tối thiểu ở người lớn?',
   'mcq', 1, 3,
   'Tối thiểu 5 cm, không quá 6 cm.'),
  ('ddddddd1-0000-0000-0000-000000000004',
   'ccccccc1-0000-0000-0000-000000000001',
   'Khi nào cần shock điện AED?',
   'mcq', 1, 4,
   'AED tự phân tích và chỉ định shock với rung thất hoặc nhịp nhanh thất vô mạch.'),
  ('ddddddd1-0000-0000-0000-000000000005',
   'ccccccc1-0000-0000-0000-000000000001',
   'Trong CPR, tỷ lệ ngắt quãng ép tim không nên vượt quá?',
   'mcq', 1, 5,
   'Mỗi lần gián đoạn không nên quá 10 giây để duy trì áp lực tưới máu.')
on conflict (id) do nothing;

-- Đáp án
insert into public.answers (question_id, content, is_correct, sort_order) values
  ('ddddddd1-0000-0000-0000-000000000001', '60-80 lần/phút', false, 1),
  ('ddddddd1-0000-0000-0000-000000000001', '80-100 lần/phút', false, 2),
  ('ddddddd1-0000-0000-0000-000000000001', '100-120 lần/phút', true,  3),
  ('ddddddd1-0000-0000-0000-000000000001', '120-140 lần/phút', false, 4);

insert into public.answers (question_id, content, is_correct, sort_order) values
  ('ddddddd1-0000-0000-0000-000000000002', '15:2',  false, 1),
  ('ddddddd1-0000-0000-0000-000000000002', '30:2',  true,  2),
  ('ddddddd1-0000-0000-0000-000000000002', '50:2',  false, 3),
  ('ddddddd1-0000-0000-0000-000000000002', '5:1',   false, 4);

insert into public.answers (question_id, content, is_correct, sort_order) values
  ('ddddddd1-0000-0000-0000-000000000003', '2-3 cm', false, 1),
  ('ddddddd1-0000-0000-0000-000000000003', '3-4 cm', false, 2),
  ('ddddddd1-0000-0000-0000-000000000003', 'Tối thiểu 5 cm', true, 3),
  ('ddddddd1-0000-0000-0000-000000000003', 'Tối thiểu 7 cm', false, 4);

insert into public.answers (question_id, content, is_correct, sort_order) values
  ('ddddddd1-0000-0000-0000-000000000004', 'Vô tâm thu', false, 1),
  ('ddddddd1-0000-0000-0000-000000000004', 'Hoạt động điện vô mạch (PEA)', false, 2),
  ('ddddddd1-0000-0000-0000-000000000004', 'Rung thất (VF) hoặc nhịp nhanh thất vô mạch (pVT)', true, 3),
  ('ddddddd1-0000-0000-0000-000000000004', 'Block nhĩ thất độ I', false, 4);

insert into public.answers (question_id, content, is_correct, sort_order) values
  ('ddddddd1-0000-0000-0000-000000000005', '5 giây', false, 1),
  ('ddddddd1-0000-0000-0000-000000000005', '10 giây', true, 2),
  ('ddddddd1-0000-0000-0000-000000000005', '20 giây', false, 3),
  ('ddddddd1-0000-0000-0000-000000000005', '30 giây', false, 4);

-- ------------------------------------------------------------
-- Tiến độ mẫu
-- ------------------------------------------------------------
insert into public.lesson_progress (student_id, lesson_id, watched_seconds, is_completed, last_watched_at) values
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbb1-0000-0000-0000-000000000001', 480, true, now()),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbb1-0000-0000-0000-000000000002', 320, false, now()),
  ('66666666-6666-6666-6666-666666666666', 'bbbbbbb1-0000-0000-0000-000000000001', 480, true, now())
on conflict (student_id, lesson_id) do nothing;

-- ------------------------------------------------------------
-- Chứng chỉ mẫu
-- ------------------------------------------------------------
insert into public.certificates (student_id, course_id)
values ('88888888-8888-8888-8888-888888888888', 'aaaaaaa1-0000-0000-0000-000000000002')
on conflict (student_id, course_id) do nothing;

-- ------------------------------------------------------------
-- Thông báo mẫu
-- ------------------------------------------------------------
insert into public.notifications (user_id, title, body, link) values
  ('44444444-4444-4444-4444-444444444444',
   'Khóa học mới: Hồi sức tim phổi cơ bản',
   'Bạn đã được phân khóa học BLS, vui lòng hoàn thành trước 31/12.',
   '/student/courses/aaaaaaa1-0000-0000-0000-000000000001'),
  ('66666666-6666-6666-6666-666666666666',
   'Lịch thi sắp tới',
   'Đề thi cuối khóa BLS sẽ mở từ ngày mai.',
   '/student/dashboard');
