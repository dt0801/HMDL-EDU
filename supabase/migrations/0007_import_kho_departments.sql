-- Departments crawled from kho.hoanmydalat.com/Admin/HeThong/TaiKhoanPhongBan
-- on 2026-05-09. The kho source exposes a tree; HMDL-edu currently stores
-- departments as a flat catalog, so sort_order follows the tree order.

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
set sort_order = excluded.sort_order;

with department_aliases(alias_name, department_name) as (
  values
    ('Phòng CNTT', 'PHÒNG CÔNG NGHỆ THÔNG TIN'),
    ('Khoa Hồi sức', 'KHOA HỒI SỨC'),
    ('Khoa Cấp cứu', 'KHOA CẤP CỨU'),
    ('Khoa Chẩn đoán hình ảnh', 'KHOA CHẨN ĐOÁN HÌNH ẢNH'),
    ('Khoa Nội', 'KHOA NỘI 1')
)
update public.profiles p
set department_id = d.id,
    department = d.name
from department_aliases a
join public.departments d on d.name = a.department_name
where trim(coalesce(p.department, '')) = a.alias_name;

update public.profiles p
set department_id = d.id,
    department = d.name
from public.departments d
where lower(trim(coalesce(p.department, ''))) = lower(d.name)
  and trim(coalesce(p.department, '')) <> '';
