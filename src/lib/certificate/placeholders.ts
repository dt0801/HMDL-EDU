export const CERTIFICATE_PLACEHOLDERS = [
  { key: "{{TEN_HOC_VIEN}}", label: "Tên học viên" },
  { key: "{{TEN_KHOA_HOC}}", label: "Tên khóa học" },
  { key: "{{NGAY_CAP}}", label: "Ngày cấp" },
  { key: "{{MA_CHUNG_CHI}}", label: "Mã chứng chỉ" },
  { key: "{{DIEM_SO}}", label: "Điểm số" },
] as const;

export type CertificatePlaceholderData = {
  studentName: string;
  courseName: string;
  issuedDate: string;
  certificateCode: string;
  score?: string | null;
};

export function replaceCertificatePlaceholders(
  text: string,
  data: CertificatePlaceholderData
) {
  return text
    .replaceAll("{{TEN_HOC_VIEN}}", data.studentName)
    .replaceAll("{{TEN_KHOA_HOC}}", data.courseName)
    .replaceAll("{{NGAY_CAP}}", data.issuedDate)
    .replaceAll("{{MA_CHUNG_CHI}}", data.certificateCode)
    .replaceAll("{{DIEM_SO}}", data.score ?? "");
}

