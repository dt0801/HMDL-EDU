"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { useCreateExam } from "@/hooks/useExams";
import { examSchema, type ExamInput } from "@/lib/validations/exam.schema";

export function NewExamForm({
  courses,
  defaultCourseId,
}: {
  courses: { id: string; title: string }[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const createExam = useCreateExam();
  const [courseId, setCourseId] = useState<string>(defaultCourseId ?? courses[0]?.id ?? "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const isPublished = watch("is_published");

  const onSubmit = (data: ExamInput) => {
    if (!courseId) {
      toast.error("Vui lòng chọn khóa học");
      return;
    }
    createExam.mutate(
      { ...data, course_id: courseId },
      {
        onSuccess: (created) => {
          toast.success("Đã tạo đề thi");
          router.push(`/instructor/exams/${created.id}`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra"),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label>Khóa học *</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger>
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={isPublished}
          onChange={(e) => setValue("is_published", e.target.checked, { shouldValidate: true })}
        />
        Xuất bản đề thi
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={createExam.isPending}>
          {createExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Tạo đề thi
        </Button>
      </div>
    </form>
  );
}
