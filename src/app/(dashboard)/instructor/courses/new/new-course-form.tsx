"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCourse, useUpdateCourse } from "@/hooks/useCourses";
import { useExamsByCourse } from "@/hooks/useExams";
import { useLessons } from "@/hooks/useLessons";
import {
  COURSE_CATEGORIES,
  courseSchema,
  type CourseInput,
} from "@/lib/validations/course.schema";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { ExamsTab } from "../[id]/exams-tab";
import { LessonsTab } from "../[id]/lessons-tab";

type TabKey = "basic" | "media" | "lessons" | "exams" | "settings";

export function NewCourseForm({ instructorId }: { instructorId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();

  const [courseId, setCourseId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("basic");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      thumbnail_url: "",
      is_published: false,
      requires_enrollment: true,
    },
  });

  const title = useWatch({ control, name: "title" });
  const description = useWatch({ control, name: "description" });
  const category = useWatch({ control, name: "category" });
  const thumbnailUrl = useWatch({ control, name: "thumbnail_url" });
  const requiresEnrollment = useWatch({ control, name: "requires_enrollment" });

  const { data: lessons, isLoading: lessonsLoading } = useLessons(courseId ?? undefined);
  const { data: exams, isLoading: examsLoading } = useExamsByCourse(courseId ?? undefined);

  const previewSrc = thumbnailPreview ?? (thumbnailUrl ? thumbnailUrl : null);

  const uploadThumbnail = async (file: File) => {
    setThumbnailUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = ext.match(/^[a-z0-9]+$/) ? ext : "png";
      const key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `courses/${key}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("course-thumbnails")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
      if (!data.publicUrl) throw new Error("Không lấy được public URL của thumbnail");

      setValue("thumbnail_url", data.publicUrl, { shouldValidate: true, shouldDirty: true });
      toast.success("Đã tải ảnh bìa lên");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload ảnh thất bại");
      throw e;
    } finally {
      setThumbnailUploading(false);
    }
  };

  const onPickThumbnail: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailPreview(URL.createObjectURL(file));
    try {
      await uploadThumbnail(file);
    } finally {
      e.target.value = "";
    }
  };

  const saving = createCourse.isPending || updateCourse.isPending;
  const [action, setAction] = useState<"draft" | "publish" | null>(null);

  const draftChecks = useMemo(() => {
    const hasTitle = (title ?? "").trim().length >= 5;
    const hasCategory = !!(category ?? "").trim();
    const hasThumb = !!(thumbnailUrl ?? "").trim() && /^https?:\/\//.test((thumbnailUrl ?? "").trim());
    const hasDescRec = (description ?? "").trim().length >= 30;
    const lessonOk = (lessons?.length ?? 0) >= 1;
    const examOptional = (exams?.length ?? 0) >= 1;

    return {
      hasTitle,
      hasCategory,
      hasThumb,
      hasDescRec,
      lessonOk,
      examOptional,
      mandatoryDone: [hasTitle, hasCategory, hasThumb].filter(Boolean).length,
      mandatoryTotal: 3,
      publishReady:
        hasTitle &&
        hasCategory &&
        hasThumb &&
        !!courseId &&
        lessonOk,
    };
  }, [title, category, thumbnailUrl, description, lessons, exams, courseId]);

  const checklistProgress = useMemo(() => {
    let done = 0;
    const total = 5;
    if (draftChecks.hasTitle) done++;
    if (draftChecks.hasCategory) done++;
    if (draftChecks.hasThumb) done++;
    if (draftChecks.hasDescRec) done++;
    if (draftChecks.lessonOk && courseId) done++;
    return Math.round((done / total) * 100);
  }, [draftChecks, courseId]);

  const persistDraft = async (data: CourseInput) => {
    const payload = { ...data, is_published: false };
    if (!courseId) {
      const created = await createCourse.mutateAsync({
        ...payload,
        instructor_id: instructorId,
      });
      setCourseId(created.id);
      return created.id;
    }
    await updateCourse.mutateAsync({ id: courseId, ...payload });
    return courseId;
  };

  const onSaveDraft = handleSubmit(async (data) => {
    try {
      setAction("draft");
      await persistDraft(data);
      toast.success(courseId ? "Đã lưu nháp" : "Đã tạo bản nháp khóa học");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setAction(null);
    }
  });

  const onPublish = handleSubmit(async (data) => {
    try {
      setAction("publish");
      if (!courseId) {
        toast.error("Vui lòng lưu nháp trước, sau đó thêm bài học rồi mới xuất bản.");
        setTab("basic");
        return;
      }
      if (!lessons?.length) {
        toast.error("Thêm ít nhất 1 bài học trước khi xuất bản.");
        setTab("lessons");
        return;
      }
      await updateCourse.mutateAsync({
        id: courseId,
        ...data,
        is_published: true,
      });
      toast.success("Đã xuất bản khóa học");
      router.push(`/instructor/courses/${courseId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không xuất bản được");
    } finally {
      setAction(null);
    }
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit shrink-0">
            <Link href="/instructor/courses">
              <ArrowLeft className="mr-1 h-4 w-4" /> Khóa học của tôi
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Tạo khóa học</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Lưu nháp thường xuyên. Xuất bản khi đã có đủ thông tin và bài học.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving || thumbnailUploading}
            onClick={() => void onSaveDraft()}
          >
            {saving && action === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu nháp
          </Button>
          <Button type="button" disabled={saving || thumbnailUploading} onClick={() => void onPublish()}>
            {saving && action === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Xuất bản
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
              <TabsTrigger value="basic" className="text-xs sm:text-sm">
                Thông tin cơ bản
              </TabsTrigger>
              <TabsTrigger value="media" className="text-xs sm:text-sm">
                Ảnh bìa &amp; mô tả
              </TabsTrigger>
              <TabsTrigger value="lessons" className="text-xs sm:text-sm" disabled={!courseId}>
                Nội dung bài học
              </TabsTrigger>
              <TabsTrigger value="exams" className="text-xs sm:text-sm" disabled={!courseId}>
                Đề thi / chứng chỉ
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">
                Cài đặt xuất bản
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-0 space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
                  <CardDescription>Tên khóa học và chuyên khoa hiển thị cho học viên.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-title">Tên khóa học *</Label>
                    <Input id="course-title" {...register("title")} placeholder="VD: An toàn đường máu sau can thiệp" />
                    {errors.title ? (
                      <p className="text-sm text-destructive">{errors.title.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Chuyên khoa *</Label>
                    <Select
                      value={category}
                      onValueChange={(v) => setValue("category", v, { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chuyên khoa" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category ? (
                      <p className="text-sm text-destructive">{errors.category.message}</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="mt-0 space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ảnh bìa &amp; mô tả</CardTitle>
                  <CardDescription>
                    Ảnh đại diện và mô tả ngắn giúp học viên hiểu nội dung khóa học.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-desc">Mô tả</Label>
                    <Textarea id="course-desc" rows={6} {...register("description")} />
                    {errors.description ? (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_file">Ảnh bìa *</Label>
                    <Input
                      id="thumbnail_file"
                      type="file"
                      accept="image/*"
                      onChange={onPickThumbnail}
                      disabled={thumbnailUploading}
                    />
                    <Input type="hidden" {...register("thumbnail_url")} />
                    {errors.thumbnail_url ? (
                      <p className="text-sm text-destructive">{errors.thumbnail_url.message}</p>
                    ) : null}
                    {previewSrc ? (
                      <div className="relative mt-2 aspect-video max-w-lg overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={previewSrc}
                          alt="Ảnh bìa"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 512px"
                        />
                      </div>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Bucket Supabase: <span className="font-medium">course-thumbnails</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lessons" className="mt-0 focus-visible:outline-none">
              {!courseId ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Lưu nháp (tab Thông tin + Ảnh bìa đủ điều kiện) để thêm bài học.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {lessonsLoading ? (
                    <Card>
                      <CardContent className="p-6 text-sm text-muted-foreground">Đang tải bài học...</CardContent>
                    </Card>
                  ) : null}
                  <LessonsTab courseId={courseId} />
                </>
              )}
            </TabsContent>

            <TabsContent value="exams" className="mt-0 space-y-4 focus-visible:outline-none">
              {!courseId ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Lưu nháp trước để gắn đề thi với khóa học.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {examsLoading ? (
                    <Card>
                      <CardContent className="p-6 text-sm text-muted-foreground">Đang tải đề thi...</CardContent>
                    </Card>
                  ) : null}
                  <ExamsTab courseId={courseId} />
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Chứng chỉ</CardTitle>
                      <CardDescription>
                        Chứng chỉ khóa học (nếu bật trong chính sách hệ thống) sẽ được xử lý sau khi học viên hoàn
                        thành điều kiện. Hiện chỉ hiển thị để bạn nắm ngữ cảnh — chưa có cấu hình chi tiết trên màn
                        này.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cài đặt xuất bản</CardTitle>
                  <CardDescription>
                    Xuất bản khóa học dùng nút <span className="font-medium">Xuất bản</span> trên đầu trang (yêu cầu
                    có ít nhất một bài học). Phần dưới là tùy chọn truy cập.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                      checked={requiresEnrollment}
                      onCheckedChange={(checked) =>
                        setValue("requires_enrollment", checked === true, { shouldValidate: true })
                      }
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium">Yêu cầu đăng ký</p>
                      <p className="text-xs text-muted-foreground">
                        Học viên phải đăng ký trước khi xem nội dung (nếu khóa học đã xuất bản).
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground" aria-live="polite">
            Mẹo: dùng các tab để làm từng phần; sidebar bên phải luôn cho biết phần nào còn thiếu.
          </p>
        </div>

        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <div>
              <p className="text-sm font-medium">Tiến độ hoàn thiện</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={checklistProgress} className="h-2 flex-1" />
                <span className="text-xs tabular-nums text-muted-foreground">{checklistProgress}%</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Checklist</p>
              <ul className="space-y-2 text-sm">
                <CheckRow ok={draftChecks.hasTitle} label="Tên khóa học (≥5 ký tự)" />
                <CheckRow ok={draftChecks.hasCategory} label="Đã chọn chuyên khoa" />
                <CheckRow ok={draftChecks.hasThumb} label="Đã có ảnh bìa" />
                <CheckRow ok={draftChecks.hasDescRec} label="Mô tả đủ gợi ý (≥30 ký tự)" optional />
                <CheckRow ok={draftChecks.lessonOk && !!courseId} label="Ít nhất 1 bài học" />
                <CheckRow ok={draftChecks.examOptional} label="Có đề thi (tuỳ chọn)" optional />
              </ul>
            </div>

            {!draftChecks.publishReady ? (
              <p className="rounded-md bg-muted/80 px-3 py-2 text-xs text-muted-foreground">
                Để xuất bản: đủ thông tin + ảnh bìa, đã lưu nháp, và có ít nhất một bài học.
              </p>
            ) : (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                Khóa học đạt điều kiện xuất bản. Bạn có thể bấm &quot;Xuất bản&quot;.
              </p>
            )}

            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium">Xem trước thẻ khóa học</p>
              <CoursePreviewCard
                title={(title ?? "").trim() || "Tên khóa học"}
                description={(description ?? "").trim()}
                category={(category ?? "").trim()}
                thumbnailUrl={previewSrc}
                isPublished={false}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CheckRow({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
      )}
      <span className={cn("leading-snug", ok ? "text-foreground" : "text-muted-foreground")}>
        {label}
        {optional ? <span className="text-muted-foreground"> (tuỳ chọn)</span> : null}
      </span>
    </li>
  );
}

function CoursePreviewCard({
  title,
  description,
  category,
  thumbnailUrl,
  isPublished,
}: {
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  isPublished: boolean;
}) {
  return (
    <Card className="overflow-hidden shadow-none">
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="360px" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-sky-100">
            <BookOpen className="h-10 w-10 text-primary/60" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {category ? (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium">{category}</span>
          ) : null}
          {!isPublished ? (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Bản nháp
            </span>
          ) : null}
        </div>
      </div>
      <CardContent className="p-3">
        <p className="line-clamp-2 font-semibold leading-snug">{title}</p>
        {description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        ) : (
          <p className="mt-1 text-xs italic text-muted-foreground">Chưa có mô tả</p>
        )}
      </CardContent>
    </Card>
  );
}
