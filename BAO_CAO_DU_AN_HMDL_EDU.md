# Báo cáo tổng quan dự án HMDL-edu

## 1. Thông tin chung

**Tên dự án:** HMDL-edu  
**Mục tiêu:** Xây dựng nền tảng đào tạo nội bộ cho nhân viên y tế, hỗ trợ quản lý khóa học, tài liệu, video bài giảng, bài thi, lớp học trực tuyến và chứng chỉ đào tạo.

HMDL-edu được thiết kế cho môi trường bệnh viện, có phân quyền theo vai trò người dùng và cơ chế bảo mật dữ liệu ở tầng database.

## 2. Công nghệ sử dụng

### Frontend

- **Next.js 14** sử dụng App Router.
- **React 18** cho giao diện người dùng.
- **TypeScript** để tăng độ an toàn khi phát triển.
- **Tailwind CSS** cho styling.
- **shadcn/ui**, **Radix UI**, **lucide-react** cho bộ component giao diện.
- **React Hook Form** và **Zod** cho form và kiểm tra dữ liệu đầu vào.
- **TanStack Query** cho quản lý dữ liệu phía client.
- **Zustand** cho trạng thái UI cục bộ.

### Backend và database

- **Supabase** làm backend chính.
- **PostgreSQL 15** là database nền tảng của Supabase.
- **Supabase Auth** quản lý đăng nhập và người dùng.
- **Supabase Storage** lưu trữ file, ảnh, tài liệu và nội dung khóa học.
- **Row Level Security (RLS)** kiểm soát quyền truy cập dữ liệu trực tiếp ở tầng database.
- **SQL migrations** để quản lý schema, policy, trigger và RPC.

### Tích hợp khác

- **Zoom Server-to-Server OAuth** cho lớp học trực tuyến.
- **Cloudinary** cho lưu trữ hoặc xuất chứng chỉ.
- **Puppeteer/Browerless** phục vụ render chứng chỉ phía server.
- **Vercel** phù hợp để triển khai frontend Next.js.

## 3. Kết luận về database

Dự án đang dùng **Supabase PostgreSQL**.

Ngôn ngữ viết database là **SQL**, cụ thể là SQL theo hệ PostgreSQL.

Các bằng chứng trong mã nguồn:

- `supabase/config.toml` cấu hình Supabase local với PostgreSQL major version 15.
- `supabase/migrations/*.sql` chứa toàn bộ schema, policy, trigger, RPC.
- `src/lib/supabase/server.ts` tạo Supabase client phía server.
- `src/lib/supabase/client.ts` tạo Supabase client phía browser.
- `package.json` có các package `@supabase/ssr`, `@supabase/supabase-js` và script quản lý database bằng Supabase CLI.

Ứng dụng truy vấn database bằng TypeScript thông qua Supabase client, ví dụ:

```ts
supabase.from("profiles").select("*")
supabase.from("courses").insert(...)
supabase.from("certificates").update(...)
supabase.rpc("get_admin_report_summary")
```

## 4. Cấu trúc database chính

Database được quản lý trong thư mục `supabase/migrations`.

Một số migration quan trọng:

- `0001_init_schema.sql`: tạo schema ban đầu.
- `0002_rls_policies.sql`: cấu hình Row Level Security.
- `0003_storage.sql`: cấu hình storage bucket.
- `0004_triggers.sql`: trigger tự động tạo profile, cập nhật timestamp, tính trạng thái.
- `0005_departments.sql`: quản lý phòng ban/khoa.
- `0009_admin_reports_rpc.sql`: RPC báo cáo cho admin.
- `0010_course_documents.sql`: quản lý tài liệu khóa học.
- `0012_live_sessions_zoom.sql`: quản lý lớp học trực tuyến Zoom.
- `0013_audit_logs.sql`: lưu lịch sử thao tác.
- `0014_certificate_generator.sql`: hỗ trợ tạo chứng chỉ.

Các bảng cốt lõi gồm:

- `profiles`: thông tin người dùng mở rộng từ Supabase Auth.
- `departments`: khoa/phòng ban.
- `courses`: khóa học.
- `lessons`: bài học.
- `course_documents`: tài liệu khóa học.
- `enrollments`: đăng ký khóa học.
- `lesson_progress`: tiến độ học.
- `exams`: bài thi.
- `questions`, `answers`: câu hỏi và đáp án.
- `exam_attempts`: lượt làm bài.
- `certificates`: chứng chỉ.
- `certificate_templates`: mẫu chứng chỉ.
- `notifications`: thông báo.
- `live_sessions`: lớp học trực tuyến.
- `audit_logs`: nhật ký thao tác.

## 5. Phân quyền hệ thống

Dự án có 3 vai trò chính:

- **Admin:** quản lý người dùng, khóa học, báo cáo, phòng ban, chứng chỉ, phân quyền và dữ liệu toàn hệ thống.
- **Instructor:** tạo và quản lý khóa học, bài học, tài liệu, bài thi, lớp học trực tuyến và chứng chỉ liên quan.
- **Student:** học khóa học, xem tài liệu/video, làm bài thi, theo dõi tiến độ và nhận chứng chỉ.

Phân quyền được kiểm soát ở nhiều lớp:

- Middleware của Next.js điều hướng người dùng theo trạng thái đăng nhập và vai trò.
- Supabase Auth xác thực tài khoản.
- PostgreSQL RLS đảm bảo người dùng chỉ truy cập dữ liệu được phép.
- Service role key chỉ dùng trong server-side code cho các thao tác quản trị.

## 6. Chức năng chính

### Quản trị viên

- Quản lý người dùng.
- Tạo tài khoản mới.
- Cập nhật vai trò, trạng thái hoạt động và phòng ban.
- Quản lý phòng ban/khoa.
- Theo dõi báo cáo tổng quan.
- Xem nhật ký hoạt động.
- Quản lý chứng chỉ và mẫu chứng chỉ.
- Quản lý khóa học, phân công giảng viên.

### Giảng viên

- Tạo và chỉnh sửa khóa học.
- Quản lý bài học.
- Upload hoặc gắn nội dung video/tài liệu.
- Tạo bài thi, câu hỏi và đáp án.
- Xem học viên trong khóa học.
- Tổ chức lớp học trực tuyến qua Zoom.
- Quản lý chứng chỉ liên quan đến khóa học.

### Học viên

- Xem danh sách khóa học.
- Đăng ký khóa học.
- Học bài học/video/tài liệu.
- Theo dõi tiến độ học.
- Làm bài thi.
- Xem kết quả bài thi.
- Xem và xác thực chứng chỉ.

## 7. Cấu trúc mã nguồn

Các thư mục chính:

- `src/app`: các route của Next.js, bao gồm auth, dashboard và API routes.
- `src/components`: component giao diện.
- `src/hooks`: các hook gọi dữ liệu Supabase.
- `src/lib/supabase`: cấu hình Supabase client/server/middleware.
- `src/lib/validations`: schema kiểm tra dữ liệu bằng Zod.
- `src/types/database.types.ts`: type TypeScript sinh từ schema Supabase.
- `supabase/migrations`: toàn bộ migration SQL.
- `supabase/seed.sql`: dữ liệu mẫu.

## 8. Môi trường chạy và triển khai

### Chạy local

Dự án cần:

- Node.js 20 trở lên.
- Docker Desktop.
- Supabase CLI.

Các lệnh chính:

```bash
npm install
npm run db:start
npm run db:reset
npm run dev
```

Supabase Studio local thường chạy tại:

```text
http://localhost:54323
```

Ứng dụng Next.js local thường chạy tại:

```text
http://localhost:3000
```

### Triển khai production

Hướng triển khai phù hợp:

- Supabase Cloud cho database, auth và storage.
- Vercel cho Next.js frontend/backend routes.
- Cloudinary hoặc storage provider tương đương cho chứng chỉ/file xuất ra.
- Cấu hình biến môi trường trong Vercel.

Các biến môi trường quan trọng:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_HOST_USER_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 9. Đánh giá hiện trạng

Dự án đã có nền tảng tương đối đầy đủ:

- Có hệ thống đăng nhập và phân quyền.
- Có dashboard theo vai trò.
- Có schema database đầy đủ bằng migration SQL.
- Có RLS để bảo vệ dữ liệu.
- Có chức năng khóa học, bài học, bài thi, tài liệu, chứng chỉ.
- Có API route cho các thao tác cần quyền server/service role.
- Có seed data phục vụ demo hoặc kiểm thử local.

Một số điểm nên kiểm tra kỹ trước khi trình diễn hoặc đưa vào vận hành:

- Kiểm tra lại toàn bộ biến môi trường production.
- Đảm bảo không expose `SUPABASE_SERVICE_ROLE_KEY` ra client.
- Kiểm thử quy trình tạo user, đổi mật khẩu, khóa/mở tài khoản.
- Kiểm thử RLS theo từng vai trò admin, instructor, student.
- Kiểm thử upload/download file qua Supabase Storage.
- Kiểm thử tạo chứng chỉ và xác thực chứng chỉ.
- Kiểm thử tích hợp Zoom nếu dùng trong thực tế.
- Kiểm tra dữ liệu tiếng Việt trong README hoặc terminal vì một số nội dung hiển thị bị lỗi encoding trên máy hiện tại.

## 10. Nhận xét tổng quan

HMDL-edu là một dự án đào tạo nội bộ được xây dựng theo hướng hiện đại, dùng Next.js cho ứng dụng web và Supabase/PostgreSQL cho backend. Điểm mạnh của dự án là đã có phân quyền rõ ràng, database được quản lý bằng migration SQL, có RLS ở tầng database và cấu trúc mã nguồn tương đối dễ mở rộng.

Với hiện trạng hiện tại, dự án phù hợp để tiếp tục hoàn thiện thành hệ thống đào tạo nội bộ chính thức, sau khi kiểm thử kỹ các luồng nghiệp vụ quan trọng và cấu hình môi trường production.
