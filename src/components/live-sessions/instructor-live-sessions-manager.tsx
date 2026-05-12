"use client";

import {
  CalendarClock,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useCourses";
import {
  useCancelLiveSession,
  useCreateLiveSession,
  useLiveSessions,
  useUpdateLiveSession,
  type LiveSessionWithDetails,
} from "@/hooks/useLiveSessions";
import type { LiveSessionInput } from "@/lib/validations/live-session.schema";
import { cn, formatDateTime } from "@/lib/utils";

import { LiveSessionDialog } from "./live-session-dialog";

const ALL_COURSES = "__all__";

function isPastSession(session: LiveSessionWithDetails) {
  return new Date(session.scheduled_start_at).getTime() < Date.now();
}

export function InstructorLiveSessionsManager({ courseId }: { courseId?: string }) {
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState(courseId ?? ALL_COURSES);
  const activeCourseId = courseId ?? (selectedCourseId === ALL_COURSES ? undefined : selectedCourseId);

  const { data: sessions = [], isLoading: sessionsLoading } = useLiveSessions(activeCourseId, {
    includeCanceled: true,
  });
  const createLiveSession = useCreateLiveSession();
  const updateLiveSession = useUpdateLiveSession();
  const cancelLiveSession = useCancelLiveSession();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSessionWithDetails | null>(null);

  const selectableCourses = useMemo(
    () => courses.map((course) => ({ id: course.id, title: course.title })),
    [courses]
  );

  const orderedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime()
      ),
    [sessions]
  );

  const handleCopyJoinLink = async (session: LiveSessionWithDetails) => {
    try {
      await navigator.clipboard.writeText(session.zoom_join_url);
      toast.success("Đã sao chép liên kết vào lớp học.");
    } catch {
      toast.error("Không sao chép được liên kết.");
    }
  };

  const handleSubmit = async (input: LiveSessionInput) => {
    try {
      if (editingSession) {
        await updateLiveSession.mutateAsync({ id: editingSession.id, ...input });
        toast.success("Đã cập nhật buổi học trực tuyến.");
      } else {
        await createLiveSession.mutateAsync(input);
        toast.success("Đã tạo meeting Zoom.");
      }

      setDialogOpen(false);
      setEditingSession(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không lưu được buổi học.");
    }
  };

  const handleCancel = async (session: LiveSessionWithDetails) => {
    if (!window.confirm(`Hủy buổi "${session.title}"?`)) return;

    try {
      await cancelLiveSession.mutateAsync({ id: session.id, courseId: session.course_id });
      toast.success("Đã hủy buổi học.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không hủy được buổi học.");
    }
  };

  if (!coursesLoading && selectableCourses.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Chưa có khóa học để tạo lịch Zoom"
        description="Tạo hoặc gán giảng viên cho khóa học trước, sau đó mới tạo buổi học trực tuyến."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl">
            {!courseId ? (
              <div className="space-y-2">
                <Label>Lọc theo khóa học</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_COURSES}>Tất cả khóa học</SelectItem>
                    {selectableCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Trạng thái hiển thị</Label>
              <div className="flex min-h-10 items-center rounded-md border px-3 text-sm text-muted-foreground">
                Bao gồm cả lịch đã hủy để giữ lịch sử quản trị.
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              setEditingSession(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo buổi học
          </Button>
        </CardContent>
      </Card>

      {sessionsLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-72" />
          ))}
        </div>
      ) : orderedSessions.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Chưa có buổi học trực tuyến"
          description="Tạo meeting Zoom đầu tiên cho khóa học để giảng viên và học viên cùng vào lớp."
          action={
            <Button
              onClick={() => {
                setEditingSession(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tạo meeting
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orderedSessions.map((session) => {
            const isPast = isPastSession(session);

            return (
              <Card key={session.id} className="flex h-full flex-col">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="line-clamp-2">{session.title}</CardTitle>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>{session.course?.title ?? "Khóa học"}</span>
                        {session.lesson?.title ? <span>{session.lesson.title}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={session.status === "canceled" ? "warning" : "secondary"}>
                        {session.status === "canceled" ? "Đã hủy" : isPast ? "Đã qua" : "Sắp diễn ra"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Bắt đầu</p>
                      <p className="mt-1 font-medium">{formatDateTime(session.scheduled_start_at)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Thời lượng</p>
                      <p className="mt-1 font-medium">{session.duration_minutes} phút</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  {session.description ? (
                    <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {session.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Không có mô tả cho buổi học này.
                    </p>
                  )}

                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{session.zoom_join_url}</span>
                    </div>
                  </div>

                  <div className="mt-auto grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopyJoinLink(session)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Sao chép link vào lớp
                    </Button>
                    <Button asChild type="button">
                      <a
                        href={`/api/live-sessions/${session.id}/host-launch`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Mở phòng host
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingSession(session);
                        setDialogOpen(true);
                      }}
                      className={cn("sm:col-span-1", session.status === "canceled" && "sm:col-span-2")}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Sửa lịch
                    </Button>
                    {session.status !== "canceled" ? (
                      <Button type="button" variant="outline" onClick={() => handleCancel(session)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hủy buổi
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LiveSessionDialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) setEditingSession(null);
        }}
        session={editingSession}
        courses={selectableCourses}
        defaultCourseId={
          courseId ?? (selectedCourseId === ALL_COURSES ? selectableCourses[0]?.id : selectedCourseId)
        }
        lockCourse={!!courseId}
        onSubmit={handleSubmit}
        isSubmitting={createLiveSession.isPending || updateLiveSession.isPending}
      />
    </div>
  );
}
