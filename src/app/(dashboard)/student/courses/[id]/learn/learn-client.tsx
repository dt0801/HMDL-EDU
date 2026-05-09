"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { VideoPlayer } from "@/components/courses/video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourse } from "@/hooks/useCourses";
import { useCourseProgress, useUpsertProgress } from "@/hooks/useLessonProgress";
import { useExamsByCourse } from "@/hooks/useExams";
import { useLessons } from "@/hooks/useLessons";
import { resolveLessonContentUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDuration } from "@/lib/utils";
import type { Lesson } from "@/types/database.types";

export function LearnClient({ courseId, studentId }: { courseId: string; studentId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { data: course } = useCourse(courseId);
  const { data: lessons, isLoading: lLoading } = useLessons(courseId);
  const { data: progress } = useCourseProgress(studentId, courseId);
  const { data: exams } = useExamsByCourse(courseId);
  const upsertProgress = useUpsertProgress();

  const publishedLessons = useMemo(
    () => (lessons ?? []).filter((l) => l.is_published),
    [lessons]
  );

  const [currentId, setCurrentId] = useState<string | null>(null);
  const current: Lesson | undefined = useMemo(
    () => publishedLessons.find((l) => l.id === currentId) ?? publishedLessons[0],
    [publishedLessons, currentId]
  );

  useEffect(() => {
    if (!currentId && publishedLessons[0]) setCurrentId(publishedLessons[0].id);
  }, [currentId, publishedLessons]);

  const { data: resolvedSrc, isFetching: srcLoading } = useQuery({
    queryKey: ["lesson-content-url", current?.id, current?.content_url],
    enabled: !!current?.content_url,
    staleTime: 50 * 60 * 1000,
    queryFn: () => resolveLessonContentUrl(supabase, current?.content_url ?? null),
  });

  const progressMap = useMemo(() => {
    const m = new Map<string, { watched: number; completed: boolean }>();
    for (const p of progress ?? []) {
      m.set(p.lesson_id, { watched: p.watched_seconds, completed: p.is_completed });
    }
    return m;
  }, [progress]);

  const completedCount = publishedLessons.filter(
    (l) => progressMap.get(l.id)?.completed
  ).length;
  const completionPercent =
    publishedLessons.length === 0
      ? 0
      : Math.round((completedCount / publishedLessons.length) * 100);

  const markComplete = (lesson: Lesson) => {
    upsertProgress.mutate({
      student_id: studentId,
      lesson_id: lesson.id,
      watched_seconds: lesson.duration_seconds ?? 0,
      is_completed: true,
    });
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link href="/student/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại danh sách
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">{course?.title ?? "Khóa học"}</h1>
            {course?.category ? (
              <Badge variant="secondary" className="mt-1">
                {course.category}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Tiến độ</span>
              <span className="font-medium">
                {completedCount}/{publishedLessons.length} bài ({completionPercent}%)
              </span>
            </div>
            <Progress value={completionPercent} />
          </div>

          {!current ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Khóa học này chưa có bài học nào.
              </CardContent>
            </Card>
          ) : current.type === "video" && current.content_url ? (
            <div className="space-y-3">
              {srcLoading && !resolvedSrc ? (
                <Skeleton className="aspect-video w-full rounded-lg" />
              ) : resolvedSrc ? (
                <VideoPlayer
                  src={resolvedSrc}
                  initialSeconds={progressMap.get(current.id)?.watched ?? 0}
                  onProgress={(s) =>
                    upsertProgress.mutate({
                      student_id: studentId,
                      lesson_id: current.id,
                      watched_seconds: s,
                      is_completed: false,
                    })
                  }
                  onEnded={() => markComplete(current)}
                />
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Không tải được video. Vui lòng thử lại sau.
                  </CardContent>
                </Card>
              )}
              <div>
                <h2 className="text-lg font-semibold">{current.title}</h2>
                {current.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
                ) : null}
              </div>
            </div>
          ) : current.type === "document" && current.content_url ? (
            <div className="space-y-3">
              {srcLoading && !resolvedSrc ? (
                <Skeleton className="aspect-[4/5] w-full rounded-lg" />
              ) : resolvedSrc ? (
                <iframe
                  src={resolvedSrc}
                  className="aspect-[4/5] w-full rounded-lg border"
                  title={current.title}
                />
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Không tải được tài liệu. Vui lòng thử lại sau.
                  </CardContent>
                </Card>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{current.title}</h2>
                  {current.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
                  ) : null}
                </div>
                <Button onClick={() => markComplete(current)} size="sm">
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Đánh dấu hoàn thành
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-semibold">{current.title}</h2>
                {current.description ? (
                  <p className="text-sm text-muted-foreground">{current.description}</p>
                ) : null}
                <Button onClick={() => markComplete(current)} size="sm">
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Đánh dấu hoàn thành
                </Button>
              </CardContent>
            </Card>
          )}

          {exams && exams.filter((e) => e.is_published).length > 0 ? (
            <Card>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <h3 className="font-semibold">Đề thi của khóa học</h3>
                <ul className="space-y-2">
                  {exams
                    .filter((e) => e.is_published)
                    .map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{e.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.duration_minutes} phút · Đạt {e.passing_score}%
                            </p>
                          </div>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/student/exams/${e.id}`}>Vào thi</Link>
                        </Button>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardContent className="p-3">
            <h3 className="px-2 py-2 text-sm font-semibold">Danh sách bài học</h3>
            {lLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <ul className="space-y-1">
                {publishedLessons.map((l, idx) => {
                  const p = progressMap.get(l.id);
                  const isActive = current?.id === l.id;
                  const Icon = l.type === "video" ? Video : FileText;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentId(l.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md p-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">
                          {idx + 1}.
                        </span>
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{l.title}</p>
                          {l.duration_seconds ? (
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(l.duration_seconds)}
                            </p>
                          ) : null}
                        </div>
                        {p?.completed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
