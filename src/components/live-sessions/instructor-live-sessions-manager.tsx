"use client";

import {
  CalendarClock,
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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourses } from "@/hooks/useCourses";
import { useCurrentProfile } from "@/hooks/useAuth";
import {
  useCancelLiveSession,
  useCreateLiveSession,
  useLiveSessions,
  useUpdateLiveSession,
  type LiveSessionWithDetails,
} from "@/hooks/useLiveSessions";
import type { LiveSessionInput } from "@/lib/validations/live-session.schema";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

import { LiveSessionDialog } from "./live-session-dialog";

const ALL_COURSES = "__all__";

function isPastSession(session: LiveSessionWithDetails) {
  return new Date(session.scheduled_start_at).getTime() < Date.now();
}

function toMs(value: string) {
  return new Date(value).getTime();
}

function formatConflictMessage(conflicts: Array<{ title: string; scheduled_start_at: string }>) {
  const parts = conflicts
    .slice(0, 3)
    .map((c) => `${c.title} (${formatDateTime(new Date(c.scheduled_start_at))})`);
  const suffix = conflicts.length > 3 ? ` (+${conflicts.length - 3})` : "";
  return `Trùng giờ với buổi khác: ${parts.join(", ")}${suffix}. Vui lòng chọn khung giờ khác.`;
}

function toDateInputValue(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInputValue(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const { data: profile } = useCurrentProfile();
  const instructorId = profile?.role === "admin" ? undefined : profile?.id;
  const { data: courses = [], isLoading: coursesLoading } = useCourses({ instructorId });
  const [selectedCourseId, setSelectedCourseId] = useState(courseId ?? ALL_COURSES);
  const activeCourseId = courseId ?? (selectedCourseId === ALL_COURSES ? undefined : selectedCourseId);
  const [view, setView] = useState<"agenda" | "calendar">("agenda");
  const [focusedDay, setFocusedDay] = useState<Date | undefined>(new Date());

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

  const dateRange: DateRange | undefined = useMemo(() => {
    const from = parseDateInputValue(fromDate) ?? undefined;
    const to = parseDateInputValue(toDate) ?? undefined;
    return from || to ? { from, to } : undefined;
  }, [fromDate, toDate]);

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

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, LiveSessionWithDetails[]>();
    for (const session of sessions) {
      if (session.status !== "scheduled") continue;
      const key = toDateInputValue(new Date(session.scheduled_start_at));
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => toMs(a.scheduled_start_at) - toMs(b.scheduled_start_at));
    }
    return map;
  }, [sessions]);

  const focusedDayKey = focusedDay ? toDateInputValue(focusedDay) : null;
  const focusedSessions = focusedDayKey ? sessionsByDay.get(focusedDayKey) ?? [] : [];

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

      // Client-side guard: avoid submitting overlapping schedules (single shared host account).
      const startMs = toMs(startIso);
      const endMs = startMs + input.duration_minutes * 60_000;
      const conflicts = sessions
        .filter((s) => s.status === "scheduled")
        .filter((s) => (editingSession ? s.id !== editingSession.id : true))
        .map((row) => {
          const rowStartMs = toMs(row.scheduled_start_at);
          const rowEndMs = rowStartMs + (row.duration_minutes ?? 0) * 60_000;
          const overlaps = rowStartMs < endMs && rowEndMs > startMs;
          return overlaps ? { title: row.title, scheduled_start_at: row.scheduled_start_at } : null;
        })
        .filter(Boolean) as Array<{ title: string; scheduled_start_at: string }>;

      if (conflicts.length > 0) {
        toast.error(formatConflictMessage(conflicts));
        return;
      }

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
              <DateRangePicker
                value={dateRange}
                onChange={(range) => {
                  const nextFrom = range?.from ? toDateInputValue(range.from) : "";
                  const nextTo = range?.to ? toDateInputValue(range.to) : "";
                  setFromDate(nextFrom);
                  setToDate(nextTo);
                }}
              />
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

      <Tabs value={view} onValueChange={(v) => setView(v as "agenda" | "calendar")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-fit">
            <TabsTrigger value="agenda">Danh sách</TabsTrigger>
            <TabsTrigger value="calendar">Lịch</TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">
            Hệ thống sẽ chặn trùng giờ khi tạo/sửa để tránh xung đột host Zoom.
          </p>
        </div>

        <TabsContent value="agenda">
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
        </TabsContent>

        <TabsContent value="calendar">
          {sessionsLoading ? (
            <div className="space-y-3">
              {[0, 1].map((index) => (
                <Skeleton key={index} className="h-72 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <Card>
                <CardContent className="p-2">
                  <Calendar
                    mode="single"
                    selected={focusedDay}
                    onSelect={setFocusedDay}
                    modifiers={{
                      hasSessions: (day: Date) => sessionsByDay.has(toDateInputValue(day)),
                    }}
                    modifiersClassNames={{
                      hasSessions: "bg-accent/60",
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">
                    {focusedDay ? `Buổi học ngày ${formatDate(focusedDay)}` : "Chọn một ngày"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {focusedDay ? "Danh sách buổi học trực tuyến trong ngày." : "Chọn ngày ở lịch để xem chi tiết."}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {focusedSessions.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Không có buổi học trong ngày này.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {focusedSessions.map((session) => {
                        const isPast = isPastSession(session);
                        return (
                          <div
                            key={session.id}
                            className={cn(
                              "flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
                              isPast ? "opacity-80" : ""
                            )}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
