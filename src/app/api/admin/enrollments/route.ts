import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAndService } from "@/lib/auth/server";
import { logAuditEvent } from "@/lib/audit/server";

export const runtime = "nodejs";

const createSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireAdminAndService("Chỉ admin mới được ghi danh.");
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const service = auth.service;

  const { data: existing, error: existErr } = await service
    .from("enrollments")
    .select("id")
    .eq("student_id", input.student_id)
    .eq("course_id", input.course_id)
    .maybeSingle();
  if (existErr) {
    return NextResponse.json({ error: existErr.message }, { status: 500 });
  }
  if (existing?.id) {
    return NextResponse.json({ error: "Học viên đã được ghi danh vào khóa học này." }, { status: 409 });
  }

  const { data: enrollment, error } = await service
    .from("enrollments")
    .insert({
      student_id: input.student_id,
      course_id: input.course_id,
      status: "active",
      completed_at: null,
    })
    .select("*")
    .single();

  if (error || !enrollment) {
    return NextResponse.json({ error: error?.message ?? "Không ghi danh được." }, { status: 500 });
  }

  await logAuditEvent(service, {
    actor_id: auth.profile.id,
    action: "enrollment.create",
    entity_type: "enrollment",
    entity_id: enrollment.id,
    details: {
      student_id: input.student_id,
      course_id: input.course_id,
    },
  }).catch(() => undefined);

  return NextResponse.json(enrollment, { status: 201 });
}
