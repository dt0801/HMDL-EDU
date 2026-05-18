import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ProfileOnboardingDialog } from "@/components/profile/profile-onboarding-dialog";
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

  const needsProfileOnboarding = profile.profile_completed_at == null;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <ProfileOnboardingDialog profile={profile} open={needsProfileOnboarding} />
      <Sidebar role={profile.role} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header profile={profile} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
