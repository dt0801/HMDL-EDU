import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { NewCourseForm } from "./new-course-form";

export const metadata = { title: "Tạo khóa học" };

export default async function NewCoursePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Tạo khóa học mới"
        description="Điền thông tin cơ bản. Bạn có thể thêm bài học sau khi tạo."
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          <NewCourseForm instructorId={user.id} />
        </CardContent>
      </Card>
    </>
  );
}
