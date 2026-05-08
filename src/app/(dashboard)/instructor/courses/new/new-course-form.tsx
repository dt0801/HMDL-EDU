"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CourseForm } from "@/components/courses/course-form";
import { useCreateCourse } from "@/hooks/useCourses";
import type { CourseInput } from "@/lib/validations/course.schema";

export function NewCourseForm({ instructorId }: { instructorId: string }) {
  const router = useRouter();
  const createCourse = useCreateCourse();

  const onSubmit = (input: CourseInput) => {
    createCourse.mutate(
      { ...input, instructor_id: instructorId },
      {
        onSuccess: (data) => {
          toast.success("Đã tạo khóa học");
          router.push(`/instructor/courses/${data.id}`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra"),
      }
    );
  };

  return (
    <CourseForm
      onSubmit={onSubmit}
      isSubmitting={createCourse.isPending}
      submitLabel="Tạo khóa học"
    />
  );
}
