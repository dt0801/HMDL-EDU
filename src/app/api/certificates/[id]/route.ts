import { Document, Page, StyleSheet, Text, View, renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  border: {
    borderWidth: 4,
    borderColor: "#0284c7",
    padding: 40,
    height: "100%",
  },
  header: { textAlign: "center", marginBottom: 30 },
  brand: { fontSize: 12, letterSpacing: 4, color: "#0284c7", marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 12, color: "#64748b" },
  body: { textAlign: "center", marginVertical: 30 },
  awardedTo: { fontSize: 14, color: "#64748b", marginBottom: 12 },
  recipient: { fontSize: 28, fontWeight: 700, marginBottom: 16, color: "#0f172a" },
  forCompletion: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  course: { fontSize: 18, fontWeight: 600, color: "#0284c7", marginBottom: 30 },
  footer: {
    position: "absolute",
    bottom: 60,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#64748b",
  },
});

type CertificateProps = {
  recipient: string;
  course: string;
  certNumber: string;
  issuedAt: string;
};

function CertificateDoc(props: CertificateProps) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(
        View,
        { style: styles.border },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.brand }, "HMDL-EDU"),
          React.createElement(Text, { style: styles.title }, "CHỨNG CHỈ HOÀN THÀNH"),
          React.createElement(
            Text,
            { style: styles.subtitle },
            "Đào tạo nội bộ - Bệnh viện HMDL"
          )
        ),
        React.createElement(
          View,
          { style: styles.body },
          React.createElement(Text, { style: styles.awardedTo }, "Chứng nhận"),
          React.createElement(Text, { style: styles.recipient }, props.recipient),
          React.createElement(
            Text,
            { style: styles.forCompletion },
            "đã hoàn thành xuất sắc khóa học"
          ),
          React.createElement(Text, { style: styles.course }, props.course)
        ),
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(Text, null, `Số: ${props.certNumber}`),
          React.createElement(Text, null, `Cấp ngày: ${props.issuedAt}`)
        )
      )
    )
  );
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  type CertRow = {
    id: string;
    cert_number: string;
    issued_at: string;
    course: { id: string; title: string } | null;
    student: { id: string; full_name: string } | null;
  };

  const { data, error } = await supabase
    .from("certificates")
    .select(
      "id, cert_number, issued_at, course:courses(id, title), student:profiles!certificates_student_id_fkey(id, full_name)"
    )
    .eq("id", params.id)
    .maybeSingle();

  const cert = data as unknown as CertRow | null;

  if (error || !cert) {
    return NextResponse.json({ error: "Không tìm thấy chứng chỉ" }, { status: 404 });
  }

  const issuedAt = new Date(cert.issued_at).toLocaleDateString("vi-VN");
  const stream = await renderToStream(
    CertificateDoc({
      recipient: cert.student?.full_name ?? "Học viên",
      course: cert.course?.title ?? "Khóa học",
      certNumber: cert.cert_number,
      issuedAt,
    })
  );

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cert.cert_number}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
