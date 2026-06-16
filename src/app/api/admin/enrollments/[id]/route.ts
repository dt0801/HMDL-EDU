import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAndService } from "@/lib/auth/server";
import { logAuditEvent } from "@/lib/audit/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["active", "completed", "dropped"]).optional(),
});

function makeCertNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rnd = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `HMDL-${y}${m}${d}-${rnd}`;
}

async function resolveCertificateTemplate(
  service: ReturnType<typeof createServiceClient>,
  courseId: string
) {
  const { data: courseTemplate } = await service
    .from("certificate_templates")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (courseTemplate?.id) return courseTemplate.id;

  const { data: globalTemplate } = await service
    .from("certificate_templates")
    .select("id")
    .is("course_id", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return globalTemplate?.id ?? null;
}

async function ensureCertificate(
  service: ReturnType<typeof createServiceClient>,
  studentId: string,
  courseId: string
) {
  const { data: existing } = await service
    .from("certificates")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existing?.id) return;

  const certNumber = makeCertNumber();
  const templateId = await resolveCertificateTemplate(service, courseId);

  await service
    .from("certificates")
    .insert({
      student_id: studentId,
      course_id: courseId,
      issued_at: new Date().toISOString(),
      cert_number: certNumber,
      certificate_code: certNumber,
      template_id: templateId,
    })
    .throwOnError();
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminAndService("Chỉ admin mới được thao tác.");
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

  const enrollmentId = params.id;
  const service = auth.service;

  const { data: before, error: beforeErr } = await service
    .from("enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 });
  if (!before) return NextResponse.json({ error: "Không tìm thấy ghi danh." }, { status: 404 });

  const nextStatus = parsed.data.status ?? before.status;
  const completedAt =
    nextStatus === "completed"
      ? before.completed_at ?? new Date().toISOString()
      : null;

  const { data: updated, error } = await service
    .from("enrollments")
    .update({
      status: nextStatus,
      completed_at: completedAt,
    })
    .eq("id", enrollmentId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Không cập nhật được ghi danh." }, { status: 500 });
  }

  if (nextStatus === "completed") {
    await ensureCertificate(service, updated.student_id, updated.course_id);
  }

  await logAuditEvent(service, {
    actor_id: auth.profile.id,
    action: "enrollment.update",
    entity_type: "enrollment",
    entity_id: updated.id,
    details: {
      before: { status: before.status, completed_at: before.completed_at },
      after: { status: nextStatus, completed_at: completedAt },
      student_id: updated.student_id,
      course_id: updated.course_id,
    },
  }).catch(() => undefined);

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminAndService("Chỉ admin mới được thao tác.");
  if ("response" in auth) return auth.response;

  const enrollmentId = params.id;
  const service = auth.service;

  const { data: before } = await service
    .from("enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();

  const { error } = await service.from("enrollments").delete().eq("id", enrollmentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(service, {
    actor_id: auth.profile.id,
    action: "enrollment.delete",
    entity_type: "enrollment",
    entity_id: enrollmentId,
    details: before ? { student_id: before.student_id, course_id: before.course_id } : null,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true }, { status: 200 });
}
