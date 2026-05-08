import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database.types";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Đăng nhập | HMDL-edu",
};

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin/users",
  instructor: "/instructor/courses",
  student: "/student/dashboard",
};

export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nếu đã đăng nhập thì điều hướng luôn (không phụ thuộc middleware).
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    redirect(profile?.role ? ROLE_HOME[profile.role] : "/student/dashboard");
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập tài khoản</h1>
        <p className="text-sm text-muted-foreground">
          Sử dụng email nội bộ bệnh viện để truy cập hệ thống đào tạo.
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Tài khoản demo (mật khẩu: HMDL@2026)</p>
        <ul className="mt-2 space-y-1">
          <li>admin@hmdl.vn — Quản trị viên</li>
          <li>bs.minh@hmdl.vn — Giảng viên</li>
          <li>dd.lan@hmdl.vn — Học viên</li>
        </ul>
      </div>
    </div>
  );
}
