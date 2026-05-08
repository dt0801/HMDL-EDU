"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
          <Label htmlFor="thumbnail_url">URL ảnh đại diện</Label>
          <Input id="thumbnail_url" placeholder="https://..." {...register("thumbnail_url")} />
          {errors.thumbnail_url ? (
            <p className="text-sm text-destructive">{errors.thumbnail_url.message}</p>
          ) : null}
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
