"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
import { lessonSchema, type LessonInput } from "@/lib/validations/lesson.schema";
import type { Lesson, LessonType } from "@/types/database.types";

export function LessonDialog({
  open,
  onOpenChange,
  lesson,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson | null;
  onSubmit: (input: LessonInput) => void;
  isSubmitting?: boolean;
}) {
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
    }
  }, [open, lesson, reset]);

  const type = watch("type");
  const isPublished = watch("is_published");

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
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content_url">URL nội dung</Label>
            <Input id="content_url" placeholder="https://..." {...register("content_url")} />
            {errors.content_url ? (
              <p className="text-sm text-destructive">{errors.content_url.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={isPublished}
              onChange={(e) =>
                setValue("is_published", e.target.checked, { shouldValidate: true })
              }
            />
            Công khai bài học cho học viên
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
