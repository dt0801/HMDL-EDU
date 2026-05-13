"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { type SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  liveSessionSchema,
  type LiveSessionInput,
} from "@/lib/validations/live-session.schema";
import type { LiveSession } from "@/types/database.types";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

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
  courseId,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: LiveSession | null;
  courseId: string;
  onSubmit: (input: LiveSessionInput) => void;
  isSubmitting?: boolean;
}) {
  const resolvedCourseId = session?.course_id ?? courseId;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<LiveSessionInput>({
    resolver: zodResolver(liveSessionSchema),
    defaultValues: {
      course_id: resolvedCourseId,
      // Keep this undefined so zod can accept it as optional; schema will transform to null.
      lesson_id: session?.lesson_id ?? undefined,
      title: "",
      description: null,
      scheduled_start_at: "",
      duration_minutes: 60,
      timezone: DEFAULT_TIMEZONE,
    },
  });

  const scheduledStartAt = watch("scheduled_start_at") ?? "";

  useEffect(() => {
    if (!open) return;

    reset({
      course_id: resolvedCourseId,
      lesson_id: session?.lesson_id ?? undefined,
      title: session?.title ?? "",
      description: session?.description ?? null,
      scheduled_start_at: session?.scheduled_start_at
        ? toDatetimeLocalValue(session.scheduled_start_at)
        : "",
      duration_minutes: session?.duration_minutes ?? 60,
      timezone: session?.timezone ?? DEFAULT_TIMEZONE,
    });
  }, [open, reset, resolvedCourseId, session]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session ? "Sửa buổi học trực tuyến" : "Tạo buổi học trực tuyến"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, ((formErrors) => {
            toast.error("Vui lòng kiểm tra lại thông tin.");
            const firstErrorField = Object.keys(formErrors)[0] as keyof LiveSessionInput | undefined;
            if (firstErrorField) setFocus(firstErrorField);
          }) satisfies SubmitErrorHandler<LiveSessionInput>)}
          className="space-y-4"
          noValidate
        >
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
              <DateTimePicker
                value={scheduledStartAt}
                onChange={(nextValue) =>
                  setValue("scheduled_start_at", nextValue, { shouldValidate: true, shouldDirty: true })
                }
              />
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
