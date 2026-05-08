"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  COURSE_CATEGORIES,
  courseSchema,
  type CourseInput,
} from "@/lib/validations/course.schema";
import { createClient } from "@/lib/supabase/client";

export function CourseForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Lưu",
}: {
  defaultValues?: Partial<CourseInput>;
  onSubmit: (input: CourseInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      category: defaultValues?.category ?? "",
      thumbnail_url: defaultValues?.thumbnail_url ?? "",
      is_published: defaultValues?.is_published ?? false,
      requires_enrollment: defaultValues?.requires_enrollment ?? true,
    },
  });

  const category = watch("category");
  const isPublished = watch("is_published");
  const requiresEnrollment = watch("requires_enrollment");
  const thumbnailUrl = watch("thumbnail_url");
  const previewSrc = thumbnailPreview ?? (thumbnailUrl ? thumbnailUrl : null);

  useEffect(() => {
    setThumbnailPreview(null);
  }, [thumbnailUrl]);

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
      toast.success("Đã tải thumbnail lên");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload thumbnail thất bại");
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
      // allow re-pick same file
      e.target.value = "";
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-busy={isSubmitting || thumbnailUploading}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Tên khóa học *</Label>
        <Input id="title" {...register("title")} />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea id="description" rows={5} {...register("description")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="space-y-2">
          <Label htmlFor="thumbnail_file">Thumbnail *</Label>
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
            <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border bg-muted">
              <Image
                src={previewSrc}
                alt="Thumbnail preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Ảnh sẽ được upload lên Supabase Storage bucket <span className="font-medium">course-thumbnails</span>.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={isPublished}
            onChange={(e) => setValue("is_published", e.target.checked, { shouldValidate: true })}
          />
          <div>
            <p className="text-sm font-medium">Xuất bản khóa học</p>
            <p className="text-xs text-muted-foreground">
              Học viên chỉ thấy khóa học khi đã xuất bản.
            </p>
          </div>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={requiresEnrollment}
            onChange={(e) =>
              setValue("requires_enrollment", e.target.checked, { shouldValidate: true })
            }
          />
          <div>
            <p className="text-sm font-medium">Yêu cầu đăng ký</p>
            <p className="text-xs text-muted-foreground">
              Học viên phải đăng ký trước khi xem nội dung.
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || thumbnailUploading}>
          {isSubmitting || thumbnailUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
