import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";

import { StudentLiveSessionsClient } from "./student-live-sessions-client";

export const metadata = { title: "Lớp học trực tuyến" };

export default async function StudentLiveSessionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Lớp học trực tuyến"
        description="Vào Zoom trực tiếp từ các khóa học bạn đang tham gia."
      />
      <StudentLiveSessionsClient studentId={user.id} />
    </>
  );
}
