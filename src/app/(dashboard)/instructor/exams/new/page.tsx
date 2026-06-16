import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { NewExamForm } from "./new-exam-form";

export const metadata = { title: "Tạo đề thi" };

export default async function NewExamPage({
  searchParams,
}: {
  searchParams: { courseId?: string; mode?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  let coursesQuery = supabase.from("courses").select("id, title").order("created_at", {
    ascending: false,
  });
  if (!isAdmin) {
    coursesQuery = coursesQuery.eq("instructor_id", user.id);
  }
  const { data: courses } = await coursesQuery;

  return (
    <>
      <PageHeader
        title="Tạo đề thi mới"
        description="Tạo đề trắc nghiệm, thêm câu hỏi thủ công hoặc upload từ file."
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          <NewExamForm
            courses={courses ?? []}
            defaultCourseId={searchParams.courseId}
            defaultMode={searchParams.mode}
          />
        </CardContent>
      </Card>
    </>
  );
}
