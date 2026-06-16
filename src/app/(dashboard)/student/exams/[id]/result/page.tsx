import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { ExamResultClient } from "./exam-result-client";

export const metadata = { title: "Kết quả thi" };

export default async function ExamResultPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { attempt?: string };
}) {
  if (!params.id || !searchParams.attempt) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <ExamResultClient examId={params.id} attemptId={searchParams.attempt} studentId={user.id} />
  );
}
