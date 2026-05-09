import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { NewCourseForm } from "./new-course-form";

export const metadata = { title: "Tạo khóa học" };

export default async function NewCoursePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NewCourseForm instructorId={user.id} />;
}
