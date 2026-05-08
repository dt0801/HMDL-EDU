import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { ExamTakeClient } from "./exam-take-client";

export const metadata = { title: "Làm bài thi" };

export default async function StudentExamPage({ params }: { params: { id: string } }) {
  if (!params.id) notFound();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ExamTakeClient examId={params.id} studentId={user.id} />;
}
