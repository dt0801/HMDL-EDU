"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExam, useExamQuestions } from "@/hooks/useExams";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDateTime } from "@/lib/utils";
import type { ExamAttempt } from "@/types/database.types";

export function ExamResultClient({
  examId,
  attemptId,
  studentId: _studentId,
}: {
  examId: string;
  attemptId: string;
  studentId: string;
}) {
  const supabase = createClient();
  const { data: exam } = useExam(examId);
  const { data: questions, isLoading: qLoading } = useExamQuestions(examId);
  const { data: attempt, isLoading: aLoading } = useQuery<ExamAttempt | null>({
    queryKey: ["exam-attempt", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (qLoading || aLoading) return <Skeleton className="h-96 w-full" />;
  if (!attempt || !exam) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          Không tìm thấy kết quả.
        </CardContent>
      </Card>
    );
  }

  const selection = (attempt.answers_snapshot ?? {}) as Record<string, string[]>;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link href="/student/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại trang chính
        </Link>
      </Button>
      <PageHeader title={`Kết quả: ${exam.title}`} />

      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Điểm số</p>
              <p className="text-3xl font-semibold">{attempt.score ?? 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trạng thái</p>
              <Badge variant={attempt.is_passed ? "success" : "destructive"} className="mt-1">
                {attempt.is_passed ? "Đạt" : "Chưa đạt"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nộp bài lúc</p>
              <p className="text-sm font-medium">
                {attempt.submitted_at ? formatDateTime(attempt.submitted_at) : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Điểm đạt yêu cầu</p>
              <p className="text-sm font-medium">{exam.passing_score}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(questions ?? []).map((q, idx) => {
          const correctIds = q.answers.filter((a) => a.is_correct).map((a) => a.id);
          const chosen = selection[q.id] ?? [];
          const isCorrect =
            correctIds.length === chosen.length && correctIds.every((id) => chosen.includes(id));
          return (
            <Card key={q.id}>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      Câu {idx + 1}. {q.content}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {q.answers.map((a) => {
                    const isChosen = chosen.includes(a.id);
                    return (
                      <li
                        key={a.id}
                        className={cn(
                          "rounded-md border p-2 text-sm",
                          a.is_correct
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : isChosen
                              ? "border-destructive/50 bg-destructive/5"
                              : "border-input"
                        )}
                      >
                        <span className="mr-2">
                          {a.is_correct ? "✓" : isChosen ? "✗" : "·"}
                        </span>
                        {a.content}
                      </li>
                    );
                  })}
                </ul>
                {q.explanation ? (
                  <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Giải thích: </span>
                    {q.explanation}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
