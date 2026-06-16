"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpen, Download, FileUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { QuestionEditor } from "@/components/exams/question-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateExam,
  useSaveQuestion,
  type QuestionWithAnswers,
} from "@/hooks/useExams";
import {
  examSchema,
  questionSchema,
  type ExamInput,
  type QuestionInput,
} from "@/lib/validations/exam.schema";

export function NewExamForm({
  courses,
  defaultCourseId,
  defaultMode,
}: {
  courses: { id: string; title: string }[];
  defaultCourseId?: string;
  defaultMode?: string;
}) {
  const router = useRouter();
  const createExam = useCreateExam();
  const saveQuestion = useSaveQuestion();
  const [courseId, setCourseId] = useState<string>(defaultCourseId ?? courses[0]?.id ?? "");

  const [step, setStep] = useState<"info" | "questions" | "settings">("info");
  const [contentMode, setContentMode] = useState<"manual" | "upload" | "bank">(
    defaultMode === "upload" ? "upload" : "manual"
  );

  const [draftQuestions, setDraftQuestions] = useState<QuestionInput[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadQuestions, setUploadQuestions] = useState<QuestionInput[]>([]);
  const [uploadLineErrors, setUploadLineErrors] = useState<string[]>([]);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [displaySettings, setDisplaySettings] = useState({
    shuffle_questions: false,
    shuffle_answers: false,
    show_score_after_submit: true,
    show_correct_answers_after_finish: false,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ExamInput>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      description: "",
      duration_minutes: 60,
      passing_score: 70,
      max_attempts: 3,
      is_published: false,
    },
  });

  const isPublished = useWatch({ control, name: "is_published" });

  const activeQuestions = contentMode === "upload" ? uploadQuestions : draftQuestions;
  const validQuestions = useMemo(() => {
    return activeQuestions.filter((q) => questionSchema.safeParse(q).success);
  }, [activeQuestions]);
  const hasValidQuestions = validQuestions.length > 0;

  const validDraftCount = useMemo(() => {
    return draftQuestions.filter((q) => questionSchema.safeParse(q).success).length;
  }, [draftQuestions]);
  const hasCourses = courses.length > 0;

  const primarySubmitLabel = useMemo(() => {
    if (!hasValidQuestions) return "Lưu nháp";
    if (isPublished) return "Lưu và xuất bản";
    return "Lưu đề thi";
  }, [hasValidQuestions, isPublished]);

  const onSubmit = async (data: ExamInput) => {
    if (!courseId) {
      toast.error("Vui lòng chọn khóa học");
      return;
    }

    if (data.is_published && !hasValidQuestions) {
      toast.error("Bạn cần có ít nhất 1 câu hỏi hợp lệ trước khi xuất bản.");
      return;
    }

    try {
      const created = await createExam.mutateAsync({ ...data, course_id: courseId });

      if (hasValidQuestions) {
        for (const [i, q] of validQuestions.entries()) {
          await saveQuestion.mutateAsync({
            examId: created.id,
            question: q,
            sortOrder: i + 1,
          });
        }
      }

      toast.success(
        hasValidQuestions ? "Đã lưu đề thi" : "Đã lưu nháp. Bạn có thể thêm câu hỏi sau."
      );
      const backParam = courseId ? `?fromCourseId=${courseId}` : "";
      router.push(`/instructor/exams/${created.id}${backParam}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    }
  };

  const editingQuestion = useMemo(() => {
    if (editingIdx === null) return null;
    const q = draftQuestions[editingIdx];
    if (!q) return null;
    const fake = {
      id: `draft-${editingIdx}`,
      exam_id: "draft",
      content: q.content,
      type: q.type,
      points: q.points,
      sort_order: editingIdx + 1,
      explanation: q.explanation ?? null,
      answers: q.answers.map((a, idx) => ({
        id: `draft-${editingIdx}-a-${idx}`,
        question_id: `draft-${editingIdx}`,
        content: a.content,
        is_correct: a.is_correct,
        sort_order: idx + 1,
      })),
    } as unknown as QuestionWithAnswers;
    return fake;
  }, [draftQuestions, editingIdx]);

  const handleSaveDraftQuestion = (input: QuestionInput) => {
    if (editingIdx === null) {
      setDraftQuestions((prev) => [...prev, input]);
    } else {
      setDraftQuestions((prev) => prev.map((q, idx) => (idx === editingIdx ? input : q)));
    }
    setEditorOpen(false);
    setEditingIdx(null);
  };

  const downloadSample = () => {
    const sample = [
      "content,type,answers,correct,points,explanation",
      '"Thủ đô của Việt Nam là?",mcq,"Hà Nội|TP.HCM|Đà Nẵng|Huế","1",1,""',
      '"Chọn các số chẵn",multi,"1|2|3|4","2|4",2,"Các số chia hết cho 2."',
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-de-thi.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return { questions: [], errors: ["File không có dữ liệu câu hỏi."] };

    const rows = lines.slice(1);
    const parsedQuestions: QuestionInput[] = [];
    const lineErrors: string[] = [];

    for (const [i, row] of rows.entries()) {
      const lineNo = i + 2; // header = line 1
      const cols = splitCsvRow(row);
      const [content, typeRaw, answersRaw, correctRaw, pointsRaw, explanation] = cols;

      const type = (typeRaw ?? "").trim() as QuestionInput["type"];
      const answers = (answersRaw ?? "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      const correct = (correctRaw ?? "")
        .split("|")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n >= 1);
      const points = Number((pointsRaw ?? "").trim());

      const q: QuestionInput = {
        content: (content ?? "").trim(),
        type: (["mcq", "multi", "true_false"] as const).includes(type) ? type : "mcq",
        points: Number.isFinite(points) ? points : 1,
        explanation: (explanation ?? "").trim(),
        answers:
          type === "true_false"
            ? [
                { content: "Đúng", is_correct: correct.includes(1) || correct.length === 0 },
                { content: "Sai", is_correct: correct.includes(2) },
              ]
            : answers.map((a, idx) => ({ content: a, is_correct: correct.includes(idx + 1) })),
      };

      const res = questionSchema.safeParse(q);
      if (!res.success) {
        const msg = res.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
        lineErrors.push(`Dòng ${lineNo}: ${msg}`);
        continue;
      }
      parsedQuestions.push(res.data);
    }

    return { questions: parsedQuestions, errors: lineErrors };
  };

  const handlePickFile = async (file: File) => {
    setUploadFile(file);
    setUploadQuestions([]);
    setUploadLineErrors([]);

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "xlsx") {
      setUploadLineErrors([
        "Upload .xlsx đang được phát triển. Hiện tại bạn có thể dùng file .csv theo mẫu để preview.",
      ]);
      return;
    }
    if (ext !== "csv") {
      setUploadLineErrors(["Vui lòng chọn file .csv hoặc .xlsx."]);
      return;
    }

    const text = await file.text();
    const { questions, errors } = parseCsv(text);
    setUploadQuestions(questions);
    setUploadLineErrors(errors);
  };

  return (
    <>
      {!hasCourses ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa có khóa học để gắn đề thi"
          description="Hãy tạo hoặc chọn ít nhất một khóa học trước khi tạo đề trắc nghiệm."
          action={
            <Button asChild>
              <Link href="/instructor/courses">
                <BookOpen className="mr-1 h-4 w-4" /> Mở danh sách khóa học
              </Link>
            </Button>
          }
        />
      ) : null}

      {courseId ? (
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={`/instructor/courses/${courseId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại khóa học
          </Link>
        </Button>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24" noValidate>
        <Card>
          <CardHeader className="space-y-4 pb-2">
            <div>
              <CardTitle>Tạo đề thi</CardTitle>
              <CardDescription className="mt-1.5">
                Ba bước: thông tin đề → nội dung câu hỏi → cài đặt hiển thị. Có thể lưu nháp bất kỳ lúc nào.
              </CardDescription>
            </div>
            <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)} className="space-y-6">
              <Stepper
                value={step}
                onValueChange={(k) => setStep(k as typeof step)}
                items={[
                  { key: "info", label: "Bước 1", description: "Thông tin" },
                  { key: "questions", label: "Bước 2", description: "Câu hỏi" },
                  { key: "settings", label: "Bước 3", description: "Cài đặt" },
                ]}
              />

              <TabsContent value="info" className="mt-0 focus-visible:outline-none">
                <div className="mx-auto max-w-2xl space-y-4 pt-1">
                  <div className="border-b pb-3">
                    <h3 className="text-sm font-semibold">Thông tin đề thi</h3>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      Chọn khóa học và nhập cấu hình thời gian, điểm đạt.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Khóa học *</Label>
                    <Select value={courseId} onValueChange={setCourseId}>
                      <SelectTrigger disabled={!hasCourses}>
                        <SelectValue placeholder="Chọn khóa học" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {hasCourses
                        ? "Đề thi sẽ gắn vào khóa học đã chọn và hiển thị cho học viên của khóa đó."
                        : "Hiện chưa có khóa học nào khả dụng để tạo đề thi."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Tên đề thi *</Label>
                    <Input id="title" {...register("title")} />
                    {errors.title ? (
                      <p className="text-sm text-destructive">{errors.title.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea id="description" rows={3} {...register("description")} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="duration_minutes">Thời gian (phút) *</Label>
                      <Input
                        id="duration_minutes"
                        type="number"
                        {...register("duration_minutes", { valueAsNumber: true })}
                      />
                      {errors.duration_minutes ? (
                        <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passing_score">Điểm đạt (%) *</Label>
                      <Input
                        id="passing_score"
                        type="number"
                        {...register("passing_score", { valueAsNumber: true })}
                      />
                      {errors.passing_score ? (
                        <p className="text-sm text-destructive">{errors.passing_score.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_attempts">Số lần thi tối đa *</Label>
                      <Input
                        id="max_attempts"
                        type="number"
                        {...register("max_attempts", { valueAsNumber: true })}
                      />
                      {errors.max_attempts ? (
                        <p className="text-sm text-destructive">{errors.max_attempts.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setStep("questions")}>
                      Tiếp tục
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="questions" className="mt-4">
                <div className="space-y-4">
                  <Tabs
                    value={contentMode}
                    onValueChange={(v) => setContentMode(v as typeof contentMode)}
                  >
                    <TabsList>
                      <TabsTrigger value="manual">Nhập thủ công</TabsTrigger>
                      <TabsTrigger value="upload">Upload từ file</TabsTrigger>
                      <TabsTrigger value="bank">Ngân hàng</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          Tổng: {draftQuestions.length} • Hợp lệ: {validDraftCount}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setEditingIdx(null);
                            setEditorOpen(true);
                          }}
                        >
                          <Plus className="mr-1 h-4 w-4" /> Thêm câu hỏi
                        </Button>
                      </div>

                      {draftQuestions.length === 0 ? (
                        <EmptyState
                          title="Chưa có câu hỏi nào"
                          description="Thêm câu hỏi đầu tiên hoặc chuyển sang Upload từ file."
                          action={
                            <Button
                              type="button"
                              onClick={() => {
                                setEditingIdx(null);
                                setEditorOpen(true);
                              }}
                            >
                              <Plus className="mr-1 h-4 w-4" /> Thêm câu hỏi
                            </Button>
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          {draftQuestions.map((q, idx) => {
                            const ok = questionSchema.safeParse(q).success;
                            return (
                              <div
                                key={idx}
                                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {idx + 1}. {q.content || "(Chưa có nội dung)"}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {ok ? "Hợp lệ" : "Chưa hợp lệ"} • {q.points} điểm
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingIdx(idx);
                                      setEditorOpen(true);
                                    }}
                                    aria-label="Sửa"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      setDraftQuestions((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    aria-label="Xóa"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-muted-foreground">
                          Hỗ trợ <span className="font-medium">.xlsx, .csv</span>. Mỗi câu hỏi cần nội dung,
                          đáp án, đáp án đúng và điểm.
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={downloadSample}>
                          <Download className="mr-1 h-4 w-4" /> Tải file mẫu
                        </Button>
                      </div>

                      <div className="rounded-lg border border-dashed bg-card p-4">
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <FileUp className="h-6 w-6 text-muted-foreground" />
                          <p className="text-sm font-medium">Chọn file để upload</p>
                          <p className="text-xs text-muted-foreground">
                            Preview/validation hiển thị tại đây. Upload/parse backend sẽ được nối sau.
                          </p>
                          <Input
                            ref={uploadInputRef}
                            type="file"
                            accept=".csv,.xlsx"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              void handlePickFile(f);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => uploadInputRef.current?.click()}
                          >
                            Chọn file
                          </Button>
                          {uploadFile ? (
                            <p className="text-xs text-muted-foreground">
                              Đã chọn: <span className="font-medium">{uploadFile.name}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {uploadLineErrors.length > 0 ? (
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-sm font-medium text-destructive">Có lỗi trong file</p>
                          <ul className="mt-2 space-y-1 text-sm text-destructive">
                            {uploadLineErrors.slice(0, 8).map((e, idx) => (
                              <li key={idx}>{e}</li>
                            ))}
                          </ul>
                          {uploadLineErrors.length > 8 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Và {uploadLineErrors.length - 8} lỗi khác…
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Preview</p>
                          <p className="text-sm text-muted-foreground">{uploadQuestions.length} câu hỏi hợp lệ</p>
                        </div>
                        {uploadQuestions.length === 0 ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Upload file theo mẫu để xem preview.
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {uploadQuestions.slice(0, 8).map((q, idx) => (
                              <div key={idx} className="rounded-md border p-2">
                                <p className="text-sm font-medium truncate">
                                  {idx + 1}. {q.content}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {q.points} điểm • {q.answers.filter((a) => a.is_correct).length} đáp án đúng
                                </p>
                              </div>
                            ))}
                            {uploadQuestions.length > 8 ? (
                              <p className="text-xs text-muted-foreground">
                                Và {uploadQuestions.length - 8} câu hỏi khác…
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="bank" className="space-y-2">
                      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                        Tính năng ngân hàng câu hỏi đang được phát triển.
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep("info")}>
                      Quay lại
                    </Button>
                    <Button type="button" onClick={() => setStep("settings")}>
                      Tiếp tục
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={isPublished}
                        disabled={!hasValidQuestions}
                        onCheckedChange={(checked) =>
                          setValue("is_published", checked === true, { shouldValidate: true })
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Xuất bản đề thi</div>
                        <div className="text-muted-foreground">
                          Học viên chỉ thấy đề thi sau khi đề được xuất bản.
                          {!hasValidQuestions ? " (Cần có câu hỏi hợp lệ để xuất bản.)" : null}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={displaySettings.shuffle_questions}
                        onCheckedChange={(checked) =>
                          setDisplaySettings((s) => ({ ...s, shuffle_questions: checked === true }))
                        }
                      />
                      Trộn câu hỏi
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={displaySettings.shuffle_answers}
                        onCheckedChange={(checked) =>
                          setDisplaySettings((s) => ({ ...s, shuffle_answers: checked === true }))
                        }
                      />
                      Trộn đáp án
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={displaySettings.show_score_after_submit}
                        onCheckedChange={(checked) =>
                          setDisplaySettings((s) => ({
                            ...s,
                            show_score_after_submit: checked === true,
                          }))
                        }
                      />
                      Hiển thị điểm sau khi nộp
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={displaySettings.show_correct_answers_after_finish}
                        onCheckedChange={(checked) =>
                          setDisplaySettings((s) => ({
                            ...s,
                            show_correct_answers_after_finish: checked === true,
                          }))
                        }
                      />
                      Cho xem đáp án đúng sau khi hoàn thành
                    </label>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    TODO: Lưu các cài đặt hiển thị vào backend khi schema sẵn sàng.
                  </p>

                  <div className="flex justify-start">
                    <Button type="button" variant="outline" onClick={() => setStep("questions")}>
                      Quay lại
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium text-foreground">Trạng thái:</span>{" "}
                  {hasValidQuestions ? "Sẵn sàng lưu" : "Chưa có câu hỏi hợp lệ"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Câu hỏi hợp lệ:</span>{" "}
                  {validQuestions.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {hasValidQuestions ? (
                <span>
                  Đã có <span className="font-medium text-foreground">{validQuestions.length}</span> câu hỏi hợp lệ.
                </span>
              ) : (
                <span>Chưa có câu hỏi hợp lệ. Bạn có thể lưu nháp để bổ sung sau.</span>
              )}
            </div>
            <Button
              type="submit"
              disabled={!hasCourses || createExam.isPending || saveQuestion.isPending}
            >
              {createExam.isPending || saveQuestion.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {primarySubmitLabel}
            </Button>
          </div>
        </div>

        <QuestionEditor
          open={editorOpen}
          onOpenChange={(o) => {
            setEditorOpen(o);
            if (!o) setEditingIdx(null);
          }}
          question={editingQuestion}
          onSubmit={handleSaveDraftQuestion}
          isSubmitting={false}
        />
      </form>
    </>
  );
}

function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      const next = row[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
