import { InstructorLiveSessionsManager } from "@/components/live-sessions/instructor-live-sessions-manager";

export function LiveSessionsTab({ courseId }: { courseId: string }) {
  return <InstructorLiveSessionsManager courseId={courseId} />;
}
