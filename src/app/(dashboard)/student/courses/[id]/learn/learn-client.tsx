"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CertificateDownloadActions } from "@/components/certificates/certificate-download-actions";
import { VideoPlayer } from "@/components/courses/video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourse } from "@/hooks/useCourses";
import {
  getDocumentKindLabel,
  useCourseDocuments,
} from "@/hooks/useDocuments";
import { useExamsByCourse } from "@/hooks/useExams";
import { useLessons } from "@/hooks/useLessons";
import { useCourseProgress, useUpsertProgress } from "@/hooks/useLessonProgress";
import { useStudentLiveSessions } from "@/hooks/useLiveSessions";
import { useCourseCertificate } from "@/hooks/useCertificates";
import { useCurrentProfile } from "@/hooks/useAuth";
import {
  isExternalUrl,
  resolveDocumentFileUrl,
  resolveLessonContentUrl,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, formatDateTime, formatDuration } from "@/lib/utils";
import type { Lesson } from "@/types/database.types";

export function LearnClient({ courseId, studentId }: { courseId: string; studentId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { data: course } = useCourse(courseId);
  const { data: profile } = useCurrentProfile();
  const { data: lessons, isLoading: lessonsLoading } = useLessons(courseId);
  const { data: progress } = useCourseProgress(studentId, courseId);
  const { data: courseCertificate } = useCourseCertificate(studentId, courseId);
  const { data: exams } = useExamsByCourse(courseId);
  const { data: liveSessions = [] } = useStudentLiveSessions(studentId, { courseId });
  const { data: documents = [] } = useCourseDocuments(courseId, {
    audience: "student",
    publishedOnly: true,
  });
  const upsertProgress = useUpsertProgress();

  const publishedLessons = useMemo(
    () => (lessons ?? []).filter((lesson) => lesson.is_published),
    [lessons]
  );

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);

  const current: Lesson | undefined = useMemo(
    () => publishedLessons.find((lesson) => lesson.id === currentId) ?? publishedLessons[0],
    [publishedLessons, currentId]
  );

  const currentLessonDocuments = useMemo(
    () => documents.filter((document) => document.lesson_id === current?.id),
    [current?.id, documents]
  );
  const courseLevelDocuments = useMemo(
    () => documents.filter((document) => document.lesson_id == null),
    [documents]
  );
  const currentLessonSessions = useMemo(
    () => liveSessions.filter((session) => session.lesson_id === current?.id),
    [current?.id, liveSessions]
  );
  const courseLevelSessions = useMemo(
    () => liveSessions.filter((session) => session.lesson_id == null),
    [liveSessions]
  );

  const { data: resolvedSrc, isFetching: srcLoading } = useQuery({
    queryKey: ["lesson-content-url", current?.id, current?.content_url],
    enabled: !!current?.content_url,
    staleTime: 50 * 60 * 1000,
    queryFn: () => resolveLessonContentUrl(supabase, current?.content_url ?? null),
  });

  const progressMap = useMemo(() => {
    const map = new Map<string, { watched: number; completed: boolean }>();
    for (const item of progress ?? []) {
      map.set(item.lesson_id, {
        watched: item.watched_seconds,
        completed: item.is_completed,
      });
    }
    return map;
  }, [progress]);

  const completedCount = publishedLessons.filter((lesson) => progressMap.get(lesson.id)?.completed)
    .length;
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

  const openDocument = async (fileUrl: string, documentId: string) => {
    setOpeningDocumentId(documentId);
    try {
      const targetUrl = isExternalUrl(fileUrl)
        ? fileUrl
        : await resolveDocumentFileUrl(supabase, fileUrl);
      if (!targetUrl) {
        toast.error("Không mở được tài liệu. Vui lòng thử lại.");
        return;
      }
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không mở được tài liệu");
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const renderDocumentSection = (
    title: string,
    description: string,
    items: typeof documents
  ) => {
    if (items.length === 0) return null;

    return (
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/student/documents">
                <BookOpenText className="mr-2 h-4 w-4" />
                Xem tất cả
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{document.title}</p>
                    <Badge variant="outline">{getDocumentKindLabel(document.document_kind)}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{document.file_name}</span>
                    {document.description ? <span>{document.description}</span> : null}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openDocument(document.file_url, document.id)}
                  disabled={openingDocumentId === document.id}
                >
                  {isExternalUrl(document.file_url) ? (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {openingDocumentId === document.id ? "Đang mở..." : "Mở"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLiveSessionSection = (
    title: string,
    description: string,
    items: typeof liveSessions
  ) => {
    if (items.length === 0) return null;

    return (
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/student/live-sessions">
                <ExternalLink className="mr-2 h-4 w-4" />
                Xem tất cả
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{session.title}</p>
                    <Badge variant="secondary">Zoom</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(session.scheduled_start_at)}</span>
                    <span>{session.duration_minutes} phút</span>
                    {session.lesson?.title ? <span>{session.lesson.title}</span> : null}
                  </div>
                  {session.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{session.description}</p>
                  ) : null}
                </div>
                <Button asChild type="button" size="sm">
                  <a href={session.zoom_join_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Vào lớp Zoom
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
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

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Chứng chỉ</p>
                {courseCertificate ? (
                  <p className="text-sm text-muted-foreground">
                    Đã cấp chứng chỉ số{" "}
                    <span className="font-medium text-foreground">{courseCertificate.cert_number}</span>{" "}
                    ({formatDate(courseCertificate.issued_at)}).
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có chứng chỉ cho khóa học này.</p>
                )}
              </div>
              {courseCertificate ? (
                <CertificateDownloadActions
                  certificateId={courseCertificate.id}
                  pdfUrl={courseCertificate.pdf_url}
                  imageUrl={courseCertificate.image_url}
                  templateJSON={courseCertificate.template?.canvas_json}
                  width={courseCertificate.template?.width}
                  height={courseCertificate.template?.height}
                  data={{
                    studentName: profile?.full_name ?? "Học viên",
                    courseName: courseCertificate.course?.title ?? course?.title ?? "Khóa học",
                    issuedDate: formatDate(courseCertificate.issued_at),
                    certificateCode: courseCertificate.certificate_code ?? courseCertificate.cert_number,
                  }}
                />
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link href="/student/certificates">Xem tất cả</Link>
                </Button>
              )}
            </CardContent>
          </Card>

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
                  onProgress={(seconds) =>
                    upsertProgress.mutate({
                      student_id: studentId,
                      lesson_id: current.id,
                      watched_seconds: seconds,
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
              <div className="flex items-center justify-between gap-3">
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

          {renderDocumentSection(
            "Tài liệu của bài học này",
            "Tài liệu được gắn trực tiếp với bài bạn đang xem.",
            currentLessonDocuments
          )}

          {renderDocumentSection(
            "Tài liệu chung của khóa học",
            "Biểu mẫu, quy trình và tài liệu tham khảo dùng cho toàn bộ khóa học.",
            courseLevelDocuments
          )}

          {renderLiveSessionSection(
            "Buổi học của bài học này",
            "Buổi Zoom được gắn trực tiếp với bài bạn đang xem.",
            currentLessonSessions
          )}

          {renderLiveSessionSection(
            "Buổi học chung của khóa học",
            "Lịch Zoom áp dụng cho toàn bộ khóa học của bạn.",
            courseLevelSessions
          )}

          {exams && exams.filter((exam) => exam.is_published).length > 0 ? (
            <Card>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <h3 className="font-semibold">Đề thi của khóa học</h3>
                <ul className="space-y-2">
                  {exams
                    .filter((exam) => exam.is_published)
                    .map((exam) => (
                      <li
                        key={exam.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{exam.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {exam.duration_minutes} phút · Đạt {exam.passing_score}%
                            </p>
                          </div>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/student/exams/${exam.id}`}>Vào thi</Link>
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
            {lessonsLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <ul className="space-y-1">
                {publishedLessons.map((lesson, index) => {
                  const itemProgress = progressMap.get(lesson.id);
                  const isActive = current?.id === lesson.id;
                  const Icon = lesson.type === "video" ? Video : FileText;

                    return (
                      <li key={lesson.id}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCurrentId(lesson.id)}
                        className={cn(
                          "h-auto w-full justify-start gap-2 rounded-md p-2 text-left text-sm",
                          isActive ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">
                          {index + 1}.
                        </span>
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{lesson.title}</p>
                          {lesson.duration_seconds ? (
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(lesson.duration_seconds)}
                            </p>
                          ) : null}
                        </div>
                        {itemProgress?.completed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : null}
                      </Button>
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
