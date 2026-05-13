"use client";

import {
  CalendarClock,
  CalendarRange,
  Copy,
  ExternalLink,
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
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/lib/utils";

import { LiveSessionDialog } from "./live-session-dialog";

const ALL_COURSES = "__all__";

function isPastSession(session: LiveSessionWithDetails) {
  return new Date(session.scheduled_start_at).getTime() < Date.now();
}

function toDateInputValue(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatScheduleHeader(date: Date) {
  const today = new Date();
  const todayKey = toDateInputValue(today);
  const tomorrowKey = toDateInputValue(addDays(today, 1));
  const key = toDateInputValue(date);

  if (key === todayKey) return "Hôm nay";
  if (key === tomorrowKey) return "Ngày mai";
  return formatDate(date, { weekday: "long" });
}

function formatTimeRange(startIso: string, durationMinutes: number) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const fmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${fmt.format(start)} - ${fmt.format(end)}`;
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
  const [fromDate, setFromDate] = useState(() => toDateInputValue(new Date()));
  const [toDate, setToDate] = useState(() => toDateInputValue(addDays(new Date(), 90)));

  const selectableCourses = useMemo(
    () => courses.map((course) => ({ id: course.id, title: course.title })),
    [courses]
  );

  const courseIdForCreate = useMemo(() => {
    if (courseId) return courseId;
    if (selectedCourseId !== ALL_COURSES) return selectedCourseId;
    return selectableCourses[0]?.id;
  }, [courseId, selectedCourseId, selectableCourses]);

  const orderedSessions = useMemo(() => {
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const toMs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

    return [...sessions]
      .filter((s) => {
        if (s.status !== "scheduled") return false;
        const start = new Date(s.scheduled_start_at).getTime();
        return start >= fromMs && start <= toMs;
      })
      .sort((a, b) => new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime());
  }, [fromDate, sessions, toDate]);

  const groupedSessions = useMemo(() => {
    const map = new Map<string, LiveSessionWithDetails[]>();
    for (const session of orderedSessions) {
      const key = toDateInputValue(new Date(session.scheduled_start_at));
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [orderedSessions]);

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
      const startIso = new Date(input.scheduled_start_at).toISOString();
      const payload = { ...input, scheduled_start_at: startIso };

      if (editingSession) {
        await updateLiveSession.mutateAsync({ id: editingSession.id, ...payload });
        toast.success("Đã cập nhật buổi học trực tuyến.");
      } else {
        await createLiveSession.mutateAsync(payload);
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
              <Label>Khoảng ngày</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Từ ngày
                  </div>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Đến ngày</div>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <Button
            disabled={!courseIdForCreate}
            onClick={() => {
              if (!courseIdForCreate) {
                toast.error("Vui lòng chọn khóa học trước khi tạo buổi học.");
                return;
              }
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
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : groupedSessions.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Chưa có buổi học trực tuyến"
          description="Tạo meeting Zoom đầu tiên cho khóa học để giảng viên và học viên cùng vào lớp."
          action={
            <Button
              disabled={!courseIdForCreate}
              onClick={() => {
                if (!courseIdForCreate) {
                  toast.error("Vui lòng chọn khóa học trước khi tạo buổi học.");
                  return;
                }
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
        <div className="space-y-6">
          {groupedSessions.map(([day, daySessions]) => {
            const headerDate = new Date(`${day}T00:00:00`);

            return (
              <Card key={day}>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">{formatScheduleHeader(headerDate)}</CardTitle>
                  <p className="text-sm text-muted-foreground">{formatDate(headerDate)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {daySessions.map((session) => {
                    const isPast = isPastSession(session);

                    return (
                      <div
                        key={session.id}
                        className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="grid w-full gap-2 sm:grid-cols-[160px_1fr] sm:items-start">
                          <div className="text-sm font-semibold tabular-nums">
                            {formatTimeRange(session.scheduled_start_at, session.duration_minutes)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{session.title}</p>
                              <Badge variant={isPast ? "outline" : "secondary"}>
                                {isPast ? "Đã qua" : "Sắp diễn ra"}
                              </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span>{session.course?.title ?? "Khóa học"}</span>
                              {session.lesson?.title ? <span>{session.lesson.title}</span> : null}
                            </div>
                            {session.zoom_meeting_id ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                ID cuộc họp: {session.zoom_meeting_id}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                          <Button type="button" variant="outline" onClick={() => handleCopyJoinLink(session)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy link
                          </Button>
                          <Button asChild type="button" variant="outline">
                            <a
                              href={`/api/live-sessions/${session.id}/host-launch`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Host
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingSession(session);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Sửa
                          </Button>
                          <Button type="button" variant="outline" onClick={() => handleCancel(session)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hủy
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {courseIdForCreate || editingSession ? (
        <LiveSessionDialog
          open={dialogOpen}
          onOpenChange={(nextOpen) => {
            setDialogOpen(nextOpen);
            if (!nextOpen) setEditingSession(null);
          }}
          session={editingSession}
          courseId={courseIdForCreate ?? editingSession!.course_id}
          onSubmit={handleSubmit}
          isSubmitting={createLiveSession.isPending || updateLiveSession.isPending}
        />
      ) : null}
    </div>
  );
}
