import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database.types";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Auto-provision profile nếu thiếu (tránh redirect loop ngay sau khi tạo user).
    await supabase.from("profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
      role: ((user.user_metadata?.role as UserRole | undefined) ?? "student") as UserRole,
      department: user.user_metadata?.department ?? null,
      is_active: true,
    });

    const refetch = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = refetch.data ?? null;

    if (!profile) {
      redirect("/login");
    }
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar role={profile.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header profile={profile} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
