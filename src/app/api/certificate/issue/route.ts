import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAndService } from "@/lib/auth/server";
import { uploadCertificateAsset } from "@/lib/certificate/cloudinary";
import { renderCertificateWithBrowserless } from "@/lib/certificate/server-render";
import { formatDate } from "@/lib/utils";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

function shouldRenderServerSide() {
  return process.env.CERTIFICATE_RENDER_MODE === "server";
}

async function withRetry<T>(label: string, task: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  const message = lastError instanceof Error ? lastError.message : "Lỗi không xác định";
  throw new Error(`${label} thất bại sau ${attempts} lần thử: ${message}`);
}

type StudentRow = {
  id: string;
  full_name: string;
};

type CourseRow = {
  id: string;
  title: string;
};

type TemplateRow = {
  id: string;
  canvas_json: Json;
  width: number;
  height: number;
};

function buildVerifyUrl(request: Request, certificateCode: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return `${baseUrl.replace(/\/$/, "")}/verify/${encodeURIComponent(certificateCode)}`;
}

async function renderAndUploadCertificate(input: {
  template: TemplateRow;
  student: StudentRow;
  course: CourseRow;
  certificateCode: string;
  issuedAt: string;
  verifyUrl: string;
}) {
  const rendered = await withRetry("Render chứng chỉ bằng Browserless", () =>
    renderCertificateWithBrowserless({
      templateJSON: input.template.canvas_json,
      width: input.template.width,
      height: input.template.height,
      verifyUrl: input.verifyUrl,
      data: {
        studentName: input.student.full_name,
        courseName: input.course.title,
        issuedDate: formatDate(input.issuedAt),
        certificateCode: input.certificateCode,
      },
    })
  );

  const [imageUrl, pdfUrl] = await Promise.all([
    withRetry("Upload PNG chứng chỉ", () =>
      uploadCertificateAsset({
        buffer: rendered.pngBuffer,
        certificateCode: input.certificateCode,
        kind: "png",
      })
    ),
    withRetry("Upload PDF chứng chỉ", () =>
      uploadCertificateAsset({
        buffer: rendered.pdfBuffer,
        certificateCode: input.certificateCode,
        kind: "pdf",
      })
    ),
  ]);

  return { imageUrl, pdfUrl };
}

export async function POST(request: Request) {
  const auth = await requireAdminAndService("Chỉ admin mới được cấp chứng chỉ.");
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
  const service = auth.service;

  const [{ data: student }, { data: course }, { data: template }] = await Promise.all([
    service.from("profiles").select("id, full_name").eq("id", input.studentId).eq("role", "student").maybeSingle(),
    service.from("courses").select("id, title").eq("id", input.courseId).maybeSingle(),
    input.templateId
      ? service
          .from("certificate_templates")
          .select("id, canvas_json, width, height")
          .eq("id", input.templateId)
          .maybeSingle()
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
  const issuedAt = existing?.issued_at ?? new Date().toISOString();
  const effectiveTemplate = (template ?? null) as unknown as TemplateRow | null;
  const shouldRender =
    shouldRenderServerSide() &&
    effectiveTemplate &&
    (!existing?.pdf_url ||
      !existing?.image_url ||
      (input.templateId != null && input.templateId !== existing?.template_id));

  let renderedUrls: { pdfUrl: string; imageUrl: string } | null = null;
  if (shouldRender && effectiveTemplate) {
    try {
      renderedUrls = await renderAndUploadCertificate({
        template: effectiveTemplate,
        student: student as unknown as StudentRow,
        course: course as unknown as CourseRow,
        certificateCode,
        issuedAt,
        verifyUrl: buildVerifyUrl(request, certificateCode),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Không render/upload được chứng chỉ." },
        { status: 502 }
      );
    }
  }

  if (existing) {
    const { data: updated, error: updateErr } = await service
      .from("certificates")
      .update({
        template_id: input.templateId ?? existing.template_id,
        certificate_code: certificateCode,
        pdf_url: renderedUrls?.pdfUrl ?? existing.pdf_url,
        image_url: renderedUrls?.imageUrl ?? existing.image_url,
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
      issued_at: issuedAt,
      pdf_url: renderedUrls?.pdfUrl ?? null,
      image_url: renderedUrls?.imageUrl ?? null,
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
