import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database.types";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin/users",
  instructor: "/instructor/courses",
  student: "/student/dashboard",
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile?.role ? ROLE_HOME[profile.role] : "/student/dashboard");
}
