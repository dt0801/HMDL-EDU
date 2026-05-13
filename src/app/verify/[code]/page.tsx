import { Award, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Xác thực chứng chỉ" };

type CertificateVerifyRow = {
  id: string;
  cert_number: string;
  certificate_code: string | null;
  issued_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  student: { full_name: string } | null;
  course: { title: string } | null;
};

async function getCertificate(code: string) {
  const service = createServiceClient();
  const select =
    "id, cert_number, certificate_code, issued_at, revoked_at, revoked_reason, student:profiles!certificates_student_id_fkey(full_name), course:courses(title)";

  const byCode = await service
    .from("certificates")
    .select(select)
    .eq("certificate_code", code)
    .maybeSingle();

  if (byCode.data) return byCode.data as unknown as CertificateVerifyRow;

  const byLegacyNumber = await service
    .from("certificates")
    .select(select)
    .eq("cert_number", code)
    .maybeSingle();

  return (byLegacyNumber.data ?? null) as unknown as CertificateVerifyRow | null;
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: { code: string };
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    notFound();
  }

  const code = decodeURIComponent(params.code).trim();
  const certificate = await getCertificate(code);
  if (!certificate) notFound();

  const revoked = Boolean(certificate.revoked_at);
  const Icon = revoked ? XCircle : CheckCircle2;

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-background shadow-sm">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Xác thực chứng chỉ</h1>
            <p className="text-sm text-muted-foreground">HMDL-edu certificate verification</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Icon className={revoked ? "h-6 w-6 text-destructive" : "h-6 w-6 text-emerald-600"} />
                <div>
                  <p className="font-semibold">
                    {revoked ? "Chứng chỉ đã bị thu hồi" : "Chứng chỉ hợp lệ"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {certificate.certificate_code ?? certificate.cert_number}
                  </p>
                </div>
              </div>
              <Badge variant={revoked ? "destructive" : "success"}>
                {revoked ? "Revoked" : "Valid"}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="text-xs uppercase text-muted-foreground">Học viên</p>
                <p className="mt-1 font-medium">{certificate.student?.full_name ?? "Học viên"}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs uppercase text-muted-foreground">Khóa học</p>
                <p className="mt-1 font-medium">{certificate.course?.title ?? "Khóa học"}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs uppercase text-muted-foreground">Ngày cấp</p>
                <p className="mt-1 font-medium">{formatDateTime(certificate.issued_at)}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs uppercase text-muted-foreground">Trạng thái</p>
                <p className="mt-1 font-medium">{revoked ? "Đã thu hồi" : "Đang hiệu lực"}</p>
              </div>
            </div>

            {revoked ? (
              <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>{certificate.revoked_reason ?? "Chứng chỉ không còn hiệu lực."}</span>
              </div>
            ) : null}

            <Button asChild variant="outline">
              <Link href="/">Về trang chủ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

