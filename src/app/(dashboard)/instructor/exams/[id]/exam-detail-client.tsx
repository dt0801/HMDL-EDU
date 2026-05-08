"use client";

import { ArrowLeft, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { QuestionEditor } from "@/components/exams/question-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteQuestion,
  useExam,
  useExamQuestions,
  useSaveQuestion,
  useUpdateExam,
  type QuestionWithAnswers,
} from "@/hooks/useExams";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExamInput, QuestionInput } from "@/lib/validations/exam.schema";

export function ExamDetailClient({ examId }: { examId: string }) {
  const { data: exam, isLoading } = useExam(examId);
  const { data: questions, isLoading: qLoading } = useExamQuestions(examId);
  const saveQuestion = useSaveQuestion();
  const deleteQuestion = useDeleteQuestion();
  const updateExam = useUpdateExam();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionWithAnswers | null>(null);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!exam) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          Không tìm thấy đề thi.
        </CardContent>
      </Card>
    );
  }

  const handleSaveQuestion = (input: QuestionInput) => {
    const sortOrder = editing
      ? questions?.find((q) => q.id === editing.id)?.sort_order ?? (questions?.length ?? 0) + 1
      : (questions?.length ?? 0) + 1;
    saveQuestion.mutate(
      { examId, question: { ...input, id: editing?.id }, sortOrder },
      {
        onSuccess: () => {
          toast.success("Đã lưu câu hỏi");
          setEditorOpen(false);
          setEditing(null);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi"),
      }
    );
  };

  const handleUpdateExam = (input: ExamInput) => {
    updateExam.mutate(
      { id: exam.id, ...input },
      {
        onSuccess: () => toast.success("Đã cập nhật đề thi"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi"),
      }
    );
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link href="/instructor/exams">
          <ArrowLeft className="mr-1 h-4 w-4" /> Đề thi
        </Link>
      </Button>
      <PageHeader
        title={exam.title}
        description={exam.course?.title ?? undefined}
        actions={
          exam.is_published ? (
            <Badge variant="success">Đã xuất bản</Badge>
          ) : (
            <Badge variant="warning">Bản nháp</Badge>
          )
        }
      />

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Câu hỏi</TabsTrigger>
          <TabsTrigger value="settings">Cài đặt</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Có {questions?.length ?? 0} câu hỏi.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setEditorOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Thêm câu hỏi
                </Button>
              </div>

              {qLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !questions || questions.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Chưa có câu hỏi nào" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Điểm</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q, idx) => (
                      <TableRow key={q.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="max-w-md truncate">{q.content}</TableCell>
                        <TableCell>{q.type}</TableCell>
                        <TableCell>{q.points}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditing(q);
                                setEditorOpen(true);
                              }}
                              aria-label="Sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (!confirm("Xóa câu hỏi này?")) return;
                                deleteQuestion.mutate(
                                  { id: q.id, examId },
                                  {
                                    onSuccess: () => toast.success("Đã xóa"),
                                    onError: (e) =>
                                      toast.error(e instanceof Error ? e.message : "Lỗi"),
                                  }
                                );
                              }}
                              aria-label="Xóa"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình đề thi</CardTitle>
              <CardDescription>Chỉnh sửa thời gian, điểm đạt, và trạng thái xuất bản.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExamSettingsForm
                defaultValues={{
                  title: exam.title,
                  description: exam.description ?? "",
                  duration_minutes: exam.duration_minutes,
                  passing_score: exam.passing_score,
                  max_attempts: exam.max_attempts,
                  is_published: exam.is_published,
                  start_at: exam.start_at,
                  end_at: exam.end_at,
                }}
                onSubmit={handleUpdateExam}
                isSubmitting={updateExam.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <QuestionEditor
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditing(null);
        }}
        question={editing}
        onSubmit={handleSaveQuestion}
        isSubmitting={saveQuestion.isPending}
      />
    </>
  );
}

function ExamSettingsForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  defaultValues: ExamInput;
  onSubmit: (input: ExamInput) => void;
  isSubmitting?: boolean;
}) {
  const [data, setData] = useState<ExamInput>(defaultValues);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Tên đề thi</Label>
        <Input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Mô tả</Label>
        <Textarea
          rows={3}
          value={data.description ?? ""}
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Thời gian (phút)</Label>
          <Input
            type="number"
            value={data.duration_minutes}
            onChange={(e) =>
              setData({ ...data, duration_minutes: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Điểm đạt (%)</Label>
          <Input
            type="number"
            value={data.passing_score}
            onChange={(e) => setData({ ...data, passing_score: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Số lần thi tối đa</Label>
          <Input
            type="number"
            value={data.max_attempts}
            onChange={(e) => setData({ ...data, max_attempts: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={data.is_published}
          onChange={(e) => setData({ ...data, is_published: e.target.checked })}
        />
        Xuất bản đề thi
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}
