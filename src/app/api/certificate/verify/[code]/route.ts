import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type VerifyRow = {
  id: string;
  cert_number: string;
  certificate_code: string | null;
  issued_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  student: { id: string; full_name: string } | null;
  course: { id: string; title: string } | null;
};

async function findCertificate(code: string) {
  const service = createServiceClient();
  const select =
    "id, cert_number, certificate_code, issued_at, revoked_at, revoked_reason, student:profiles!certificates_student_id_fkey(id, full_name), course:courses(id, title)";

  const byCode = await service
    .from("certificates")
    .select(select)
    .eq("certificate_code", code)
    .maybeSingle();

  if (byCode.error) throw byCode.error;
  if (byCode.data) return byCode.data as unknown as VerifyRow;

  const byLegacyNumber = await service
    .from("certificates")
    .select(select)
    .eq("cert_number", code)
    .maybeSingle();

  if (byLegacyNumber.error) throw byLegacyNumber.error;
  return (byLegacyNumber.data ?? null) as unknown as VerifyRow | null;
}

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { valid: false, error: "Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 500 }
    );
  }

  const code = decodeURIComponent(params.code).trim();
  if (!code) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const certificate = await findCertificate(code);
  if (!certificate) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const revoked = Boolean(certificate.revoked_at);

  return NextResponse.json({
    valid: !revoked,
    revoked,
    revokedReason: certificate.revoked_reason,
    certificateCode: certificate.certificate_code ?? certificate.cert_number,
    studentName: certificate.student?.full_name ?? "Học viên",
    courseName: certificate.course?.title ?? "Khóa học",
    issuedAt: certificate.issued_at,
  });
}

