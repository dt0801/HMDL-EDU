import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createUserSchema } from "@/lib/validations/user.schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Chỉ quản trị viên mới được tạo người dùng." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const departmentId = input.department_id ?? null;

  const service = createServiceClient();

  // Resolve tên phòng ban (mirror text vào profiles.department)
  let departmentName: string | null = input.department ?? null;
  if (departmentId && !departmentName) {
    const { data: dept } = await service
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .maybeSingle();
    departmentName = dept?.name ?? null;
  }

  // 1) Tạo auth user (trigger handle_new_user sẽ tự insert profile cơ bản)
  const created = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      role: input.role,
      department: departmentName,
    },
  });

  if (created.error || !created.data.user) {
    return NextResponse.json(
      { error: created.error?.message ?? "Không tạo được tài khoản auth." },
      { status: 400 }
    );
  }

  const newUserId = created.data.user.id;

  // 2) Cập nhật/đảm bảo profile có department_id, role, is_active đúng
  const { error: upsertErr } = await service.from("profiles").upsert(
    {
      id: newUserId,
      full_name: input.full_name,
      email: input.email,
      role: input.role,
      department: departmentName,
      department_id: departmentId,
      is_active: input.is_active,
    },
    { onConflict: "id" }
  );

  if (upsertErr) {
    // Rollback auth user nếu profile lỗi để tránh dữ liệu treo.
    await service.auth.admin.deleteUser(newUserId).catch(() => undefined);
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: newUserId }, { status: 201 });
}
