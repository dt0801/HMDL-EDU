import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { BrowseCoursesClient } from "./browse-courses-client";

export const metadata = { title: "Khám phá khóa học" };

export default async function StudentCoursesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <BrowseCoursesClient studentId={user.id} />;
}
