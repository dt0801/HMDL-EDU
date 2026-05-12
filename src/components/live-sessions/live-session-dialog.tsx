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
import { useLessons } from "@/hooks/useLessons";
import {
  liveSessionSchema,
  type LiveSessionInput,
} from "@/lib/validations/live-session.schema";
import type { LiveSession } from "@/types/database.types";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const NO_LESSON = "__none__";

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function LiveSessionDialog({
  open,
  onOpenChange,
  session,
  courses,
  defaultCourseId,
  lockCourse,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: LiveSession | null;
  courses: Array<{ id: string; title: string }>;
  defaultCourseId?: string;
  lockCourse?: boolean;
  onSubmit: (input: LiveSessionInput) => void;
  isSubmitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LiveSessionInput>({
    resolver: zodResolver(liveSessionSchema),
    defaultValues: {
      course_id: defaultCourseId ?? "",
      lesson_id: null,
      title: "",
      description: null,
      scheduled_start_at: "",
      duration_minutes: 60,
      timezone: DEFAULT_TIMEZONE,
    },
  });

  const selectedCourseId = watch("course_id");
  const selectedLessonId = watch("lesson_id");
  const { data: lessons = [] } = useLessons(selectedCourseId || undefined);

  useEffect(() => {
    if (!open) return;

    reset({
      course_id: session?.course_id ?? defaultCourseId ?? "",
      lesson_id: session?.lesson_id ?? null,
      title: session?.title ?? "",
      description: session?.description ?? null,
      scheduled_start_at: session?.scheduled_start_at
        ? toDatetimeLocalValue(session.scheduled_start_at)
        : "",
      duration_minutes: session?.duration_minutes ?? 60,
      timezone: session?.timezone ?? DEFAULT_TIMEZONE,
    });
  }, [defaultCourseId, open, reset, session]);

  useEffect(() => {
    if (!selectedLessonId) return;
    if (lessons.some((lesson) => lesson.id === selectedLessonId)) return;
    setValue("lesson_id", null, { shouldValidate: true, shouldDirty: true });
  }, [lessons, selectedLessonId, setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session ? "Sửa buổi học trực tuyến" : "Tạo buổi học trực tuyến"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Khóa học</Label>
              <Select
                value={selectedCourseId}
                onValueChange={(value) =>
                  setValue("course_id", value, { shouldValidate: true, shouldDirty: true })
                }
                disabled={lockCourse}
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

            <div className="space-y-2">
              <Label>Bài học liên kết</Label>
              <Select
                value={selectedLessonId ?? NO_LESSON}
                onValueChange={(value) =>
                  setValue("lesson_id", value === NO_LESSON ? null : value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                disabled={!selectedCourseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Không gắn bài học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LESSON}>Không gắn bài học</SelectItem>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.lesson_id ? (
                <p className="text-sm text-destructive">{errors.lesson_id.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_title">Tiêu đề</Label>
            <Input id="session_title" {...register("title")} />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_description">Mô tả</Label>
            <Textarea
              id="session_description"
              rows={4}
              {...register("description", {
                setValueAs: (value) => {
                  if (typeof value !== "string") return null;
                  const trimmed = value.trim();
                  return trimmed.length > 0 ? trimmed : null;
                },
              })}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start_at">Bắt đầu lúc</Label>
              <Input id="scheduled_start_at" type="datetime-local" {...register("scheduled_start_at")} />
              {errors.scheduled_start_at ? (
                <p className="text-sm text-destructive">
                  {errors.scheduled_start_at.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Thời lượng (phút)</Label>
              <Input id="duration_minutes" type="number" {...register("duration_minutes")} />
              {errors.duration_minutes ? (
                <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Múi giờ</Label>
            <Input id="timezone" readOnly {...register("timezone")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {session ? "Lưu thay đổi" : "Tạo meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
