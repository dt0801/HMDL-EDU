import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAndService } from "@/lib/auth/server";

export const runtime = "nodejs";

const patchSchema = z.object({
  email: z.string().email().max(200).optional(),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .max(72, "Mật khẩu tối đa 72 ký tự")
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminAndService("Chỉ quản trị viên mới được thao tác người dùng.");
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const targetUserId = params.id;
  if (!targetUserId) {
    return NextResponse.json({ error: "Thiếu user id" }, { status: 400 });
  }

  if (!input.email && !input.password) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const service = auth.service;
  const { data: updated, error: updateErr } = await service.auth.admin.updateUserById(
    targetUserId,
    {
      ...(input.email ? { email: input.email, email_confirm: true } : null),
      ...(input.password ? { password: input.password } : null),
    }
  );

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  if (input.email) {
    const { error: profileUpdateErr } = await service
      .from("profiles")
      .update({ email: input.email })
      .eq("id", targetUserId);
    if (profileUpdateErr) {
      return NextResponse.json({ error: profileUpdateErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, user: updated.user }, { status: 200 });
}
