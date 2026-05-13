"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
  COURSE_CONTENT_BUCKET,
  buildLessonStoragePath,
  isExternalUrl,
} from "@/lib/storage";
import { lessonSchema, type LessonInput } from "@/lib/validations/lesson.schema";
import type { Lesson, LessonType } from "@/types/database.types";

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const DOC_ACCEPT = "application/pdf";
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB cảnh báo mềm

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    video.addEventListener("loadedmetadata", () => {
      const seconds = Number.isFinite(video.duration)
        ? Math.round(video.duration)
        : null;
      cleanup();
      resolve(seconds);
    });
    video.addEventListener("error", () => {
      cleanup();
      resolve(null);
    });
  });
}

export function LessonDialog({
  open,
  onOpenChange,
  lesson,
  courseId,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson | null;
  courseId: string;
  onSubmit: (input: LessonInput) => void;
  isSubmitting?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LessonInput>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "video",
      content_url: "",
      duration_seconds: null,
      is_published: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: lesson?.title ?? "",
        description: lesson?.description ?? "",
        type: lesson?.type ?? "video",
        content_url: lesson?.content_url ?? "",
        duration_seconds: lesson?.duration_seconds ?? null,
        is_published: lesson?.is_published ?? true,
      });
      setUploadProgress(null);
    }
  }, [open, lesson, reset]);

  const type = watch("type");
  const isPublished = watch("is_published");
  const contentUrl = watch("content_url") ?? "";
  const hasUploadedFile = contentUrl !== "" && !isExternalUrl(contentUrl);

  const acceptByType: Record<LessonType, string | undefined> = {
    video: VIDEO_ACCEPT,
    document: DOC_ACCEPT,
    text: undefined,
  };
  const accept = acceptByType[type];

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (type === "video" && !file.type.startsWith("video/")) {
      toast.error("Vui lòng chọn file video (mp4, webm, mov...).");
      return;
    }
    if (type === "document" && file.type !== "application/pdf") {
      toast.error("Vui lòng chọn file PDF.");
      return;
    }
    if (type === "video" && file.size > MAX_VIDEO_BYTES) {
      toast.warning(
        `File ${(file.size / 1024 / 1024).toFixed(0)}MB khá lớn. Cân nhắc nén bớt để tránh lỗi upload.`
      );
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const path = buildLessonStoragePath(courseId, file.name);

      const { error: uploadErr } = await supabase.storage
        .from(COURSE_CONTENT_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
          cacheControl: "3600",
        });
      if (uploadErr) throw uploadErr;

      setValue("content_url", path, { shouldValidate: true, shouldDirty: true });

      if (type === "video") {
        const seconds = await readVideoDuration(file).catch(() => null);
        if (seconds && seconds > 0) {
          setValue("duration_seconds", seconds, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }

      setUploadProgress(100);
      toast.success("Đã tải tệp lên.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedFile = async () => {
    if (!hasUploadedFile) {
      setValue("content_url", "", { shouldValidate: true, shouldDirty: true });
      return;
    }
    const path = contentUrl;
    setValue("content_url", "", { shouldValidate: true, shouldDirty: true });
    setUploadProgress(null);
    // Best-effort xóa file trên storage. Không chặn UX nếu lỗi.
    await supabase.storage
      .from(COURSE_CONTENT_BUCKET)
      .remove([path])
      .catch(() => undefined);
  };

  const fileLabelByType: Record<LessonType, string> = {
    video: "Tệp video (MP4 / WEBM / MOV)",
    document: "Tệp PDF",
    text: "",
  };

  const showUploader = type === "video" || type === "document";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lesson ? "Sửa bài học" : "Thêm bài học mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="title">Tên bài học *</Label>
            <Input id="title" {...register("title")} />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setValue("type", v as LessonType, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Tài liệu PDF</SelectItem>
                  <SelectItem value="text">Văn bản</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_seconds">Thời lượng (giây)</Label>
              <Input
                id="duration_seconds"
                type="number"
                {...register("duration_seconds", {
                  setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                })}
              />
              {type === "video" ? (
                <p className="text-xs text-muted-foreground">
                  Tự điền theo metadata của video sau khi upload.
                </p>
              ) : null}
            </div>
          </div>

          {showUploader ? (
            <div className="space-y-2">
              <Label htmlFor="content_file">{fileLabelByType[type]}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="content_file"
                  type="file"
                  accept={accept}
                  onChange={onPickFile}
                  disabled={uploading}
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
                  Đang tải tệp lên Supabase Storage...
                </div>
              ) : null}

              {!uploading && hasUploadedFile ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs">
                  <UploadCloud className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">Đã lưu: {contentUrl}</span>
                </div>
              ) : null}

              {!uploading && !hasUploadedFile && contentUrl ? (
                <p className="text-xs text-muted-foreground">
                  Đang sử dụng URL ngoài: {contentUrl}
                </p>
              ) : null}

              {uploadProgress !== null && uploading ? (
                <div className="h-1 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="content_url">
              {showUploader ? "Hoặc dán URL ngoài (tùy chọn)" : "URL nội dung"}
            </Label>
            <Input
              id="content_url"
              placeholder="https://..."
              {...register("content_url")}
              disabled={uploading || hasUploadedFile}
            />
            {errors.content_url ? (
              <p className="text-sm text-destructive">{errors.content_url.message}</p>
            ) : null}
            {showUploader && hasUploadedFile ? (
              <p className="text-xs text-muted-foreground">
                Bỏ tệp đã tải để có thể nhập URL ngoài.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isPublished}
              onCheckedChange={(checked) =>
                setValue("is_published", checked === true, { shouldValidate: true })
              }
            />
            Công khai bài học cho học viên
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
