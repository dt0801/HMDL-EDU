"use client";

import { CheckCircle2, ClipboardList, Clock3, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useDashboardProfile } from "@/components/providers/dashboard-profile-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentExams, useStudentAttempts } from "@/hooks/useExams";

export function StudentExamsClient() {
  const profile = useDashboardProfile();
  const { data: exams, isLoading: examsLoading } = useStudentExams(profile.id);
  const { data: attempts, isLoading: attemptsLoading } = useStudentAttempts(profile.id);

  const examStates = useMemo(() => {
    const attemptsByExam = new Map<string, typeof attempts>();
    for (const attempt of attempts ?? []) {
      const list = attemptsByExam.get(attempt.exam_id) ?? [];
      list.push(attempt);
      attemptsByExam.set(attempt.exam_id, list);
    }

    return (exams ?? []).map((exam) => {
      const examAttempts = attemptsByExam.get(exam.id) ?? [];
      const latestAttempt = examAttempts[0];
      const usedAttempts = examAttempts.length;
      const remainingAttempts = Math.max(exam.max_attempts - usedAttempts, 0);
      const questionCount = exam.questions?.[0]?.count ?? 0;

      return {
        exam,
        latestAttempt,
        usedAttempts,
        remainingAttempts,
        questionCount,
      };
    });
  }, [attempts, exams]);

  return (
    <>
      <PageHeader
        title="Thi trắc nghiệm"
        description="Làm các đề thi đã được phát hành cho những khóa học bạn đang tham gia."
      />

      {examsLoading || attemptsLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : examStates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Chưa có đề thi nào khả dụng"
          description="Khi khóa học của bạn có đề thi đã xuất bản, chúng sẽ xuất hiện tại đây."
          action={
            <Button asChild>
              <Link href="/student/courses">Xem khóa học của tôi</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          {examStates.map(({ exam, latestAttempt, usedAttempts, remainingAttempts, questionCount }) => {
            const canStart = remainingAttempts > 0 && questionCount > 0;

            return (
              <Card key={exam.id} className="flex h-full flex-col overflow-hidden">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="line-clamp-2 text-lg">{exam.title}</CardTitle>
                      {exam.course?.title ? (
                        <p className="mt-1 text-sm text-muted-foreground">{exam.course.title}</p>
                      ) : null}
                    </div>
                    {latestAttempt?.is_passed ? (
                      <Badge variant="success">Đã đạt</Badge>
                    ) : remainingAttempts === 0 ? (
                      <Badge variant="warning">Hết lượt</Badge>
                    ) : (
                      <Badge variant="secondary">Sẵn sàng</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {exam.course?.category ? (
                      <Badge variant="outline">{exam.course.category}</Badge>
                    ) : null}
                    <Badge variant="outline">{questionCount} câu</Badge>
                    <Badge variant="outline">{exam.duration_minutes} phút</Badge>
                    <Badge variant="outline">Đạt {exam.passing_score}%</Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                  {exam.description ? (
                    <div className="min-h-[4.5rem]">
                      <p className="line-clamp-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {exam.description}
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-3 sm:items-stretch">
                    <div className="flex min-h-[5rem] flex-col justify-center rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Số câu</p>
                      <p className="mt-1 font-semibold tabular-nums">{questionCount}</p>
                    </div>
                    <div className="flex min-h-[5rem] flex-col justify-center rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Lượt đã dùng</p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {usedAttempts}/{exam.max_attempts}
                      </p>
                    </div>
                    <div className="flex min-h-[5rem] flex-col justify-center rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Lượt còn lại</p>
                      <p className="mt-1 font-semibold tabular-nums">{remainingAttempts}</p>
                    </div>
                  </div>

                  {latestAttempt ? (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {latestAttempt.is_passed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-medium">Lần thi gần nhất:</span>
                        <span className="tabular-nums">{latestAttempt.score ?? 0}%</span>
                        <span className="text-muted-foreground">
                          {latestAttempt.is_passed ? "Đạt" : "Chưa đạt"}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    {canStart ? (
                      <Button asChild className="w-full sm:flex-1">
                        <Link href={`/student/exams/${exam.id}`}>
                          <ClipboardList className="mr-2 h-4 w-4" /> Vào thi
                        </Link>
                      </Button>
                    ) : (
                      <Button className="w-full sm:flex-1" type="button" disabled>
                        <ClipboardList className="mr-2 h-4 w-4" /> Chưa thể làm bài
                      </Button>
                    )}
                    {latestAttempt ? (
                      <Button asChild variant="outline" className="w-full sm:flex-1">
                        <Link href={`/student/exams/${exam.id}/result?attempt=${latestAttempt.id}`}>
                          <Clock3 className="mr-2 h-4 w-4" /> Xem kết quả
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
