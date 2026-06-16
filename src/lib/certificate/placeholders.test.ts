import { describe, expect, it } from "vitest";

import { replaceCertificatePlaceholders } from "./placeholders";

describe("replaceCertificatePlaceholders", () => {
  it("replaces every supported certificate placeholder", () => {
    const result = replaceCertificatePlaceholders(
      "{{TEN_HOC_VIEN}} - {{TEN_KHOA_HOC}} - {{NGAY_CAP}} - {{MA_CHUNG_CHI}} - {{DIEM_SO}}",
      {
        studentName: "Nguyen Van A",
        courseName: "An toan nguoi benh",
        issuedDate: "16/06/2026",
        certificateCode: "CERT-2026-001",
        score: "9.5",
      }
    );

    expect(result).toBe("Nguyen Van A - An toan nguoi benh - 16/06/2026 - CERT-2026-001 - 9.5");
  });

  it("removes the score placeholder when no score is available", () => {
    const result = replaceCertificatePlaceholders("Diem: {{DIEM_SO}}", {
      studentName: "Nguyen Van A",
      courseName: "An toan nguoi benh",
      issuedDate: "16/06/2026",
      certificateCode: "CERT-2026-001",
      score: null,
    });

    expect(result).toBe("Diem: ");
  });
});
