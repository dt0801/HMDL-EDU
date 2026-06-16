"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  COURSE_DOCUMENTS_BUCKET,
  buildDocumentStoragePath,
  isExternalUrl,
} from "@/lib/storage";
import {
  courseDocumentSchema,
  type CourseDocumentInput,
} from "@/lib/validations/course-document.schema";
import { useLessons } from "@/hooks/useLessons";
import type {
  CourseDocumentAudience,
  CourseDocumentKind,
} from "@/types/database.types";

import type { CourseDocumentWithCourse } from "@/hooks/useDocuments";

const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png";
const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

function fileNameToTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function DocumentDialog({
  open,
  onOpenChange,
  document,
  courses,
  defaultCourseId,
  lockCourse = false,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: CourseDocumentWithCourse | null;
  courses: Array<{ id: string; title: string }>;
  defaultCourseId?: string;
  lockCourse?: boolean;
  onSubmit: (input: CourseDocumentInput) => void;
  isSubmitting?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CourseDocumentInput>({
    resolver: zodResolver(courseDocumentSchema),
    defaultValues: {
      course_id: defaultCourseId ?? "",
      lesson_id: null,
      title: "",
      description: "",
      file_name: "",
      file_url: "",
      mime_type: null,
      file_size_bytes: null,
      audience: "both",
      document_kind: "reference",
      is_published: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      course_id: document?.course_id ?? defaultCourseId ?? courses[0]?.id ?? "",
      lesson_id: document?.lesson_id ?? null,
      title: document?.title ?? "",
      description: document?.description ?? "",
      file_name: document?.file_name ?? "",
      file_url: document?.file_url ?? "",
      mime_type: document?.mime_type ?? null,
      file_size_bytes: document?.file_size_bytes ?? null,
      audience: document?.audience ?? "both",
      document_kind: document?.document_kind ?? "reference",
      is_published: document?.is_published ?? true,
    });
  }, [courses, defaultCourseId, document, open, reset]);

  const courseId = useWatch({ control, name: "course_id" });
  const lessonId = useWatch({ control, name: "lesson_id" });
  const audience = useWatch({ control, name: "audience" });
  const documentKind = useWatch({ control, name: "document_kind" });
  const isPublished = useWatch({ control, name: "is_published" });
  const fileUrl = useWatch({ control, name: "file_url" }) ?? "";
  const title = useWatch({ control, name: "title" }) ?? "";
  const hasUploadedFile = fileUrl !== "" && !isExternalUrl(fileUrl);
  const { data: lessons = [] } = useLessons(courseId || undefined);

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!courseId) {
      toast.error("Vui lòng chọn khóa học trước khi tải tệp.");
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.warning("Tệp khá lớn. Nên dùng PDF hoặc tài liệu đã nén để tải nhanh hơn.");
    }

    setUploading(true);
    try {
      const path = buildDocumentStoragePath(courseId, file.name);
      const { error } = await supabase.storage.from(COURSE_DOCUMENTS_BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: "3600",
      });
      if (error) throw error;

      setValue("file_url", path, { shouldValidate: true, shouldDirty: true });
      setValue("file_name", file.name, { shouldValidate: true, shouldDirty: true });
      setValue("mime_type", file.type || null, { shouldValidate: true, shouldDirty: true });
      setValue("file_size_bytes", file.size, { shouldValidate: true, shouldDirty: true });

      if (!title) {
        setValue("title", fileNameToTitle(file.name), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      toast.success("Đã tải tài liệu lên.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedFile = async () => {
    if (!hasUploadedFile) {
      setValue("file_url", "", { shouldValidate: true, shouldDirty: true });
      return;
    }

    const path = fileUrl;
    setValue("file_url", "", { shouldValidate: true, shouldDirty: true });
    setValue("mime_type", null, { shouldValidate: true, shouldDirty: true });
    setValue("file_size_bytes", null, { shouldValidate: true, shouldDirty: true });

    await supabase.storage
      .from(COURSE_DOCUMENTS_BUCKET)
      .remove([path])
      .catch(() => undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document ? "Sửa tài liệu" : "Thêm tài liệu mới"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Khóa học</Label>
            <Select
              value={courseId}
              disabled={lockCourse || !!document}
              onValueChange={(value) => {
                setValue("course_id", value, { shouldValidate: true, shouldDirty: true });
                if (!document) {
                  setValue("lesson_id", null, { shouldValidate: true, shouldDirty: true });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn khóa học" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.course_id ? (
              <p className="text-sm text-destructive">{errors.course_id.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại tài liệu</Label>
              <Select
                value={documentKind}
                onValueChange={(value) =>
                  setValue("document_kind", value as CourseDocumentKind, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="procedure">Quy trình</SelectItem>
                  <SelectItem value="template">Biểu mẫu</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="reference">Tham khảo</SelectItem>
                  <SelectItem value="policy">Chính sách</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gắn với bài học</Label>
              <Select
                value={lessonId ?? "__none__"}
                onValueChange={(value) =>
                  setValue("lesson_id", value === "__none__" ? null : value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tài liệu chung của khóa học</SelectItem>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      Bài {lesson.sort_order}: {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Tên tài liệu *</Label>
            <Input id="title" {...register("title")} />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hiển thị cho</Label>
              <Select
                value={audience}
                onValueChange={(value) =>
                  setValue("audience", value as CourseDocumentAudience, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Cả giảng viên và học viên</SelectItem>
                  <SelectItem value="student">Chỉ học viên</SelectItem>
                  <SelectItem value="instructor">Chỉ giảng viên</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file_name">Tên tệp hiển thị *</Label>
              <Input id="file_name" {...register("file_name")} />
              {errors.file_name ? (
                <p className="text-sm text-destructive">{errors.file_name.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_file">Tệp tài liệu</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document_file"
                type="file"
                accept={DOCUMENT_ACCEPT}
                disabled={uploading || !courseId}
                onChange={onPickFile}
              />
              {hasUploadedFile ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={removeUploadedFile}
                  disabled={uploading}
                  aria-label="Xóa tệp đã tải"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            {uploading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải tài liệu lên Supabase Storage...
              </div>
            ) : null}
            {!uploading && hasUploadedFile ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs">
                <UploadCloud className="h-4 w-4 text-emerald-600" />
                <span className="truncate">Đã lưu: {fileUrl}</span>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_url">Hoặc nhập liên kết ngoài</Label>
            <Input
              id="file_url"
              placeholder="https://..."
              disabled={uploading || hasUploadedFile}
              {...register("file_url")}
            />
            {errors.file_url ? (
              <p className="text-sm text-destructive">{errors.file_url.message}</p>
            ) : null}
            {hasUploadedFile ? (
              <p className="text-xs text-muted-foreground">
                Xóa tệp đã tải nếu bạn muốn chuyển sang dùng liên kết ngoài.
              </p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isPublished}
              onCheckedChange={(checked) =>
                setValue("is_published", checked === true, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            Phát hành tài liệu cho người được phép xem
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu tài liệu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
