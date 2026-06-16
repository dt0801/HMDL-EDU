import { describe, expect, it } from "vitest";

import { deniedFor, isPublicPath } from "./middleware";

describe("middleware route helpers", () => {
  it("keeps auth and certificate verification paths public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/verify/CERT-2026-001")).toBe(true);
    expect(isPublicPath("/api/certificate/verify/CERT-2026-001")).toBe(true);
    expect(isPublicPath("/student/dashboard")).toBe(false);
  });

  it("enforces role boundaries for dashboard areas", () => {
    expect(deniedFor("admin", "/admin/users")).toBe(false);
    expect(deniedFor("instructor", "/admin/users")).toBe(true);
    expect(deniedFor("student", "/admin/users")).toBe(true);

    expect(deniedFor("admin", "/instructor/courses")).toBe(false);
    expect(deniedFor("instructor", "/instructor/courses")).toBe(false);
    expect(deniedFor("student", "/instructor/courses")).toBe(true);

    expect(deniedFor("student", "/student/dashboard")).toBe(false);
    expect(deniedFor(null, "/student/dashboard")).toBe(true);
  });
});
