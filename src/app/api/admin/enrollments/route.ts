import { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const createSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
});

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
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Chỉ admin mới được ghi danh." }, { status: 403 });
  }

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
  const service = createServiceClient();

  // prevent duplicates
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
    actor_id: profile.id,
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

