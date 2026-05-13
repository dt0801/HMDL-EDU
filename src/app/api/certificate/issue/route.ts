import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const issueSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
});

function makeCertificateCode() {
  const year = new Date().getFullYear();
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `CERT-${year}-${suffix}`;
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "Chỉ admin mới được cấp chứng chỉ." }, { status: 403 }) };
  }

  return { profile };
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 500 }
    );
  }

  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const service = createServiceClient();

  const [{ data: student }, { data: course }, { data: template }] = await Promise.all([
    service.from("profiles").select("id").eq("id", input.studentId).eq("role", "student").maybeSingle(),
    service.from("courses").select("id").eq("id", input.courseId).maybeSingle(),
    input.templateId
      ? service.from("certificate_templates").select("id").eq("id", input.templateId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!student) {
    return NextResponse.json({ error: "Không tìm thấy học viên." }, { status: 404 });
  }
  if (!course) {
    return NextResponse.json({ error: "Không tìm thấy khóa học." }, { status: 404 });
  }
  if (input.templateId && !template) {
    return NextResponse.json({ error: "Không tìm thấy mẫu chứng chỉ." }, { status: 404 });
  }

  const { data: existing, error: existingErr } = await service
    .from("certificates")
    .select("*")
    .eq("student_id", input.studentId)
    .eq("course_id", input.courseId)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const certificateCode = existing?.certificate_code ?? existing?.cert_number ?? makeCertificateCode();

  if (existing) {
    const { data: updated, error: updateErr } = await service
      .from("certificates")
      .update({
        template_id: input.templateId ?? existing.template_id,
        certificate_code: certificateCode,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: updateErr?.message ?? "Không cập nhật được chứng chỉ." }, { status: 500 });
    }

    return NextResponse.json({
      ...updated,
      certificateCode,
      pdfUrl: updated.pdf_url ?? `/api/certificates/${updated.id}`,
      imageUrl: updated.image_url,
    });
  }

  const { data: issued, error } = await service
    .from("certificates")
    .insert({
      student_id: input.studentId,
      course_id: input.courseId,
      template_id: input.templateId ?? null,
      cert_number: certificateCode,
      certificate_code: certificateCode,
      issued_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !issued) {
    return NextResponse.json({ error: error?.message ?? "Không cấp được chứng chỉ." }, { status: 500 });
  }

  return NextResponse.json(
    {
      ...issued,
      certificateCode,
      pdfUrl: issued.pdf_url ?? `/api/certificates/${issued.id}`,
      imageUrl: issued.image_url,
    },
    { status: 201 }
  );
}

