import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { StudentExamsClient } from "./student-exams-client";

export const metadata = { title: "Thi trắc nghiệm" };

export default async function StudentExamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <StudentExamsClient studentId={user.id} />;
}
