import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { NewExamForm } from "./new-exam-form";

export const metadata = { title: "Tạo đề thi" };

export default async function NewExamPage({
  searchParams,
}: {
  searchParams: { courseId?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Tạo đề thi mới"
        description="Đặt thông tin chung. Sau khi tạo, bạn có thể thêm câu hỏi."
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          <NewExamForm
            courses={courses ?? []}
            defaultCourseId={searchParams.courseId}
          />
        </CardContent>
      </Card>
    </>
  );
}
