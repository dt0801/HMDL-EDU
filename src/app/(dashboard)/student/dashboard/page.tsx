import { redirect } from "next/navigation";

import { StudentDashboardClient } from "./dashboard-client";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Trang chính" };

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <StudentDashboardClient studentId={user.id} />;
}
