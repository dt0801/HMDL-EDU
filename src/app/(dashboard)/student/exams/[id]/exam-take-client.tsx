"use client";

import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ExamPlayer, type AnswerSelection } from "@/components/exams/exam-player";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExam, useExamQuestions, useStudentAttempts } from "@/hooks/useExams";
import { createClient } from "@/lib/supabase/client";

export function ExamTakeClient({ examId, studentId }: { examId: string; studentId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const { data: exam, isLoading } = useExam(examId);
  const { data: questions, isLoading: qLoading } = useExamQuestions(examId);
  const { data: attempts } = useStudentAttempts(studentId, examId);

  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading || qLoading) return <Skeleton className="h-96 w-full" />;
  if (!exam) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          Không tìm thấy đề thi.
        </CardContent>
      </Card>
    );
  }

  const usedAttempts = attempts?.length ?? 0;
  const remainingAttempts = exam.max_attempts - usedAttempts;
  const canStart = remainingAttempts > 0 && (questions?.length ?? 0) > 0;

  const handleSubmit = async (selection: AnswerSelection) => {
    if (!questions) return;
    setSubmitting(true);

    let totalPoints = 0;
    let earnedPoints = 0;
    for (const q of questions) {
      totalPoints += q.points;
      const correctIds = q.answers.filter((a) => a.is_correct).map((a) => a.id);
      const chosenIds = selection[q.id] ?? [];
      const isCorrect =
        correctIds.length === chosenIds.length &&
        correctIds.every((id) => chosenIds.includes(id));
      if (isCorrect) earnedPoints += q.points;
    }

    const score = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 1000) / 10;

    const { data, error } = await supabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        student_id: studentId,
        score,
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        answers_snapshot: selection,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (error || !data) {
      toast.error(error?.message ?? "Không lưu được kết quả");
      return;
    }
    toast.success(`Hoàn thành. Điểm: ${score}%`);
    router.push(`/student/exams/${examId}/result?attempt=${data.id}`);
  };

  if (!started) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={exam.course?.id ? `/student/courses/${exam.course.id}/learn` : "/student/dashboard"}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại khóa học
          </Link>
        </Button>
        <PageHeader title={exam.title} description={exam.course?.title ?? undefined} />
        <Card>
          <CardHeader>
            <CardTitle>Thông tin đề thi</CardTitle>
            <CardDescription>{exam.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm">
              <li>• Số câu hỏi: {questions?.length ?? 0}</li>
              <li>• Thời gian: {exam.duration_minutes} phút</li>
              <li>• Điểm đạt: {exam.passing_score}%</li>
              <li>
                • Số lần thi đã dùng: {usedAttempts}/{exam.max_attempts}
              </li>
            </ul>
            {!canStart ? (
              <p className="text-sm text-destructive">
                Bạn đã hết lượt thi hoặc đề thi chưa có câu hỏi.
              </p>
            ) : (
              <Button onClick={() => setStarted(true)} className="w-full sm:w-auto">
                <ClipboardList className="mr-2 h-4 w-4" /> Bắt đầu làm bài
              </Button>
            )}

            {attempts && attempts.length > 0 ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="mb-2 font-medium">Lịch sử thi</p>
                <ul className="space-y-1">
                  {attempts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>
                        Điểm: {a.score ?? "—"}% {a.is_passed ? "(Đạt)" : "(Chưa đạt)"}
                      </span>
                      <Link
                        href={`/student/exams/${examId}/result?attempt=${a.id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Xem chi tiết
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </>
    );
  }

  if (!questions || questions.length === 0) return null;

  return (
    <>
      <PageHeader title={exam.title} description="Tập trung làm bài. Đồng hồ đang chạy." />
      <ExamPlayer
        questions={questions}
        durationMinutes={exam.duration_minutes}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
      />
    </>
  );
}
