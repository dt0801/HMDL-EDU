import { PageHeader } from "@/components/layout/page-header";

import { StudentLiveSessionsClient } from "./student-live-sessions-client";

export const metadata = { title: "Lớp học trực tuyến" };

export default function StudentLiveSessionsPage() {
  return (
    <>
      <PageHeader
        title="Lớp học trực tuyến"
        description="Vào Zoom trực tiếp từ các khóa học bạn đang tham gia."
      />
      <StudentLiveSessionsClient />
    </>
  );
}
