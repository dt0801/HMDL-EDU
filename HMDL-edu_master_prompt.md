# HMDL-edu — Master Prompt cho AI Coding Assistant

---

## 1. Tổng quan dự án

Bạn là senior full-stack developer.  
Hãy giúp tôi xây dựng **HMDL-edu** — nền tảng đào tạo nội bộ cho môi trường bệnh viện.

- **Người dùng:** ~300 nhân viên y tế (bác sĩ, điều dưỡng, kỹ thuật viên)
- **Mục tiêu:** Quản lý khóa học, video bài giảng, đề thi, chứng chỉ đào tạo nội bộ
- **Ngôn ngữ giao diện:** Tiếng Việt

---

## 2. Tech Stack (KHÔNG thay đổi)

```
Frontend :  Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend  :  Supabase (Auth + PostgreSQL + Storage + Edge Functions)
Deploy   :  Vercel (frontend) + Supabase Cloud
UI       :  shadcn/ui + React Hook Form + Zod
State    :  TanStack Query (server state) + Zustand (client state)
```

**Quy tắc bắt buộc khi sinh code:**
- Luôn dùng TypeScript strict mode, không dùng `any`
- Mọi form đều dùng React Hook Form + Zod schema validation
- Mọi data fetching dùng TanStack Query (không fetch thủ công trong useEffect)
- Dùng Supabase SSR client (`@supabase/ssr`) cho Next.js App Router, KHÔNG dùng `@supabase/auth-helpers-nextjs` (deprecated)
- Tất cả route cần auth phải có middleware bảo vệ
- UI component ưu tiên từ shadcn/ui trước khi tự viết

---

## 3. Phân quyền hệ thống

Có 3 role cứng, lưu trong `profiles.role`:

| Role | Quyền |
|---|---|
| `admin` | Toàn quyền — quản lý user, khóa học, xem mọi báo cáo |
| `instructor` | Tạo/sửa khóa học, upload nội dung, tạo đề thi, xem học viên của mình |
| `student` | Xem/đăng ký khóa học, xem video, làm bài thi, xem kết quả của bản thân |

**Row Level Security (RLS) là bắt buộc** — mọi bảng đều phải có RLS policy tương ứng với role.

---

## 4. Database Schema (PostgreSQL / Supabase)

```sql
-- Profiles (mở rộng từ auth.users)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null check (role in ('admin','instructor','student')),
  department  text,                    -- Khoa/phòng ban
  avatar_url  text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Khóa học
create table courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  thumbnail_url text,
  category     text,                   -- Chuyên khoa: 'Tim mạch', 'Ngoại', 'ICU'...
  instructor_id uuid references profiles(id),
  is_published  boolean default false,
  requires_enrollment boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Bài học (video hoặc tài liệu)
create table lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references courses(id) on delete cascade,
  title       text not null,
  description text,
  type        text check (type in ('video','document','text')),
  content_url text,                    -- URL video hoặc file PDF
  duration_seconds int,
  sort_order  int default 0,
  is_published boolean default false,
  created_at  timestamptz default now()
);

-- Đăng ký khóa học
create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references profiles(id) on delete cascade,
  course_id   uuid references courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  status      text default 'active' check (status in ('active','completed','dropped')),
  unique(student_id, course_id)
);

-- Tiến độ học từng bài
create table lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid references profiles(id) on delete cascade,
  lesson_id      uuid references lessons(id) on delete cascade,
  watched_seconds int default 0,
  is_completed   boolean default false,
  last_watched_at timestamptz,
  unique(student_id, lesson_id)
);

-- Đề thi
create table exams (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid references courses(id) on delete cascade,
  title        text not null,
  description  text,
  duration_minutes int default 60,
  passing_score    int default 70,      -- % điểm đạt
  max_attempts     int default 3,
  is_published     boolean default false,
  start_at     timestamptz,             -- Null = mở tự do
  end_at       timestamptz,
  created_at   timestamptz default now()
);

-- Câu hỏi
create table questions (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid references exams(id) on delete cascade,
  content     text not null,
  type        text default 'mcq' check (type in ('mcq','multi','true_false')),
  points      int default 1,
  sort_order  int default 0,
  explanation text                      -- Giải thích đáp án
);

-- Đáp án
create table answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  content     text not null,
  is_correct  boolean default false,
  sort_order  int default 0
);

-- Lần thi của học viên
create table exam_attempts (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid references exams(id),
  student_id  uuid references profiles(id),
  score       numeric(5,2),
  is_passed   boolean,
  started_at  timestamptz default now(),
  submitted_at timestamptz,
  answers_snapshot jsonb                -- Lưu snapshot đáp án đã chọn
);

-- Chứng chỉ
create table certificates (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references profiles(id),
  course_id    uuid references courses(id),
  issued_at    timestamptz default now(),
  cert_number  text unique default 'CERT-' || substr(gen_random_uuid()::text,1,8)
);

-- Thông báo
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  is_read     boolean default false,
  link        text,
  created_at  timestamptz default now()
);
```

---

## 5. RLS Policies mẫu

```sql
-- Bật RLS
alter table profiles enable row level security;
alter table courses enable row level security;
alter table enrollments enable row level security;
alter table exam_attempts enable row level security;

-- profiles: user chỉ đọc được profile của mình, admin đọc tất cả
create policy "users_read_own_profile" on profiles
  for select using (auth.uid() = id);

create policy "admin_read_all_profiles" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- courses: student chỉ thấy khóa đã publish
create policy "students_see_published_courses" on courses
  for select using (
    is_published = true
    or instructor_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- exam_attempts: student chỉ thấy kết quả của mình
create policy "student_own_attempts" on exam_attempts
  for select using (student_id = auth.uid());
```

---

## 6. Cấu trúc thư mục Next.js

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Sidebar + auth guard
│   │   ├── admin/
│   │   │   ├── users/page.tsx
│   │   │   ├── courses/page.tsx
│   │   │   └── reports/page.tsx
│   │   ├── instructor/
│   │   │   ├── courses/page.tsx
│   │   │   ├── courses/[id]/page.tsx
│   │   │   └── exams/page.tsx
│   │   └── student/
│   │       ├── dashboard/page.tsx
│   │       ├── courses/page.tsx
│   │       ├── courses/[id]/learn/page.tsx
│   │       └── exams/[id]/page.tsx
│   └── api/
│       └── certificates/[id]/route.ts
├── components/
│   ├── ui/                         ← shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── courses/
│   │   ├── CourseCard.tsx
│   │   └── CourseForm.tsx
│   └── exams/
│       ├── QuestionEditor.tsx
│       └── ExamPlayer.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Browser client
│   │   ├── server.ts               ← Server client (RSC)
│   │   └── middleware.ts
│   ├── validations/
│   │   ├── course.schema.ts
│   │   ├── exam.schema.ts
│   │   └── auth.schema.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useCourses.ts
│   └── useExams.ts
├── stores/
│   └── ui.store.ts                 ← Zustand (sidebar state, modals...)
└── types/
    └── database.types.ts           ← Generated từ Supabase
```

---

## 7. Các màn hình cần xây dựng

### Admin
- [ ] Quản lý người dùng (CRUD, kích hoạt/khóa tài khoản, đặt role)
- [ ] Tổng quan báo cáo (số học viên, tỷ lệ hoàn thành, điểm thi trung bình)
- [ ] Quản lý danh mục khóa học

### Giảng viên
- [ ] Dashboard — khóa học của tôi, học viên đang học
- [ ] Tạo / sửa khóa học (title, mô tả, thumbnail, danh mục)
- [ ] Quản lý bài học trong khóa — thêm video/PDF, kéo thả sắp xếp thứ tự
- [ ] Tạo đề thi — thêm câu hỏi MCQ, đặt thời gian, điểm đạt
- [ ] Xem danh sách học viên đã đăng ký + tiến độ + điểm thi

### Học viên
- [ ] Dashboard — khóa học đang học, deadline, tiến độ
- [ ] Khám phá và đăng ký khóa học
- [ ] Trang học — xem video/tài liệu, tracking tiến độ tự động
- [ ] Làm bài thi — timer, chọn đáp án, nộp bài
- [ ] Xem kết quả thi chi tiết + đáp án đúng
- [ ] Chứng chỉ hoàn thành (có thể tải PDF)

---

## 8. Các pattern code cần tuân theo

### Supabase server client (App Router)
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

### Middleware auth guard
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Zod schema mẫu
```typescript
// lib/validations/course.schema.ts
import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z.string().min(5, 'Tên khóa học tối thiểu 5 ký tự').max(200),
  description: z.string().optional(),
  category: z.string().min(1, 'Vui lòng chọn chuyên khoa'),
  is_published: z.boolean().default(false),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
```

### TanStack Query hook mẫu
```typescript
// hooks/useCourses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useCourses() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
```

---

## 9. Biến môi trường cần thiết

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # Chỉ dùng server-side
NEXT_PUBLIC_APP_URL=https://hmdl-edu.vercel.app
```

---

## 10. Thứ tự xây dựng (theo sprint)

**Sprint 1 — Nền tảng (tuần 1-2)**
1. Khởi tạo Next.js + cài đặt toàn bộ dependencies
2. Setup Supabase: tạo bảng, RLS, storage buckets
3. Auth flow: đăng nhập email, middleware, redirect theo role
4. Layout dashboard: sidebar, header, mobile responsive

**Sprint 2 — Khóa học (tuần 3-4)**
5. CRUD khóa học (admin + instructor)
6. CRUD bài học, upload tài liệu PDF lên Supabase Storage
7. Trang học viên: danh sách, đăng ký, xem bài học
8. Tracking tiến độ học (lesson_progress)

**Sprint 3 — Thi cử (tuần 5-6)**
9. Tạo đề thi + câu hỏi (instructor)
10. Thi online: timer, chọn đáp án, auto-submit
11. Chấm điểm tự động, lưu kết quả
12. Xem lại bài thi + đáp án đúng

**Sprint 4 — Hoàn thiện (tuần 7-8)**
13. Cấp chứng chỉ tự động khi đạt điểm
14. Dashboard báo cáo admin
15. Hệ thống thông báo
16. Export báo cáo Excel

---

## Cách dùng prompt này

Khi giao task cho AI, hãy dùng format:

> "Dựa vào context trong [HMDL-edu Master Prompt], hãy xây dựng [tên tính năng cụ thể].  
> Yêu cầu: [mô tả thêm nếu có]"

Ví dụ:
> "Dựa vào HMDL-edu Master Prompt, hãy xây dựng trang tạo khóa học cho giảng viên. Dùng React Hook Form + Zod schema đã định nghĩa, sau khi submit thành công redirect về `/instructor/courses`."
