"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StudentLiveSessionsList } from "@/components/live-sessions/student-live-sessions-list";
import { useDashboardProfile } from "@/components/providers/dashboard-profile-provider";
import { useStudentLiveSessions } from "@/hooks/useLiveSessions";

export function StudentLiveSessionsClient() {
  const profile = useDashboardProfile();
  const { data: sessions = [], isLoading } = useStudentLiveSessions(profile.id);

  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <StudentLiveSessionsList
      sessions={sessions}
      showCourse
      emptyTitle="Chưa có buổi học trực tuyến"
      emptyDescription="Khi khóa học của bạn được lên lịch Zoom, buổi học sẽ xuất hiện tại đây."
    />
  );
}
