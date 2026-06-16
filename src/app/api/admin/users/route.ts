import { NextResponse } from "next/server";

import { requireAdminAndService } from "@/lib/auth/server";
import { createUserSchema } from "@/lib/validations/user.schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminAndService("Chỉ quản trị viên mới được tạo người dùng.");
  if ("response" in auth) return auth.response;

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
  const service = auth.service;

  let departmentName: string | null = input.department ?? null;
  if (departmentId && !departmentName) {
    const { data: dept } = await service
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .maybeSingle();
    departmentName = dept?.name ?? null;
  }

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
    await service.auth.admin.deleteUser(newUserId).catch(() => undefined);
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: newUserId }, { status: 201 });
}
