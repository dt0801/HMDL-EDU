import { PageHeader } from "@/components/layout/page-header";
import { InstructorLiveSessionsManager } from "@/components/live-sessions/instructor-live-sessions-manager";

export const metadata = { title: "Lớp học trực tuyến" };

export default function InstructorLiveSessionsPage() {
  return (
    <>
      <PageHeader
        title="Lớp học trực tuyến"
        description="Tạo và quản lý các buổi học Zoom cho từng khóa học."
      />
      <InstructorLiveSessionsManager />
    </>
  );
}
