"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CourseForm } from "@/components/courses/course-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useCreateCourse } from "@/hooks/useCourses";
import type { CourseInput } from "@/lib/validations/course.schema";

import { LessonsTab } from "../[id]/lessons-tab";
import { ExamsTab } from "../[id]/exams-tab";

export function NewCourseForm({ instructorId }: { instructorId: string }) {
  const router = useRouter();
  const createCourse = useCreateCourse();
  const [step, setStep] = useState<"info" | "lessons" | "exams">("info");
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  const onSubmit = (input: CourseInput) => {
    createCourse.mutate(
      { ...input, instructor_id: instructorId },
      {
        onSuccess: (data) => {
          toast.success("Đã tạo khóa học");
          setCreatedCourseId(data.id);
          setStep("lessons");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra"),
      }
    );
  };

  return (
    <div className="space-y-3 pb-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/instructor/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Khóa học của tôi
        </Link>
      </Button>

      <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)}>
        <Stepper
          value={step}
          onValueChange={(k) => setStep(k as typeof step)}
          items={[
            { key: "info", label: "Step 1", description: "Thông tin" },
            { key: "lessons", label: "Step 2", description: "Bài học", disabled: !createdCourseId },
            { key: "exams", label: "Step 3", description: "Đề thi", disabled: !createdCourseId },
          ]}
        />

        <TabsContent value="info" className="mt-4">
          <CourseForm onSubmit={onSubmit} isSubmitting={createCourse.isPending} submitLabel="Tạo khóa học" />
        </TabsContent>

        <TabsContent value="lessons" className="mt-4 space-y-3">
          {createdCourseId ? (
            <>
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground sm:p-6">
                  Bạn đang thêm bài học cho khóa học vừa tạo. Bạn có thể quay lại bước Thông tin để chỉnh sửa
                  trong trang chi tiết khóa học sau khi lưu.
                </CardContent>
              </Card>
              <LessonsTab courseId={createdCourseId} />
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setStep("info")}>
                  Quay lại
                </Button>
                <Button type="button" onClick={() => setStep("exams")}>
                  Tiếp tục
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Hãy hoàn thành bước Thông tin để tạo khóa học trước.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exams" className="mt-4 space-y-3">
          {createdCourseId ? (
            <>
              <ExamsTab courseId={createdCourseId} />
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setStep("lessons")}>
                  Quay lại
                </Button>
                <Button type="button" onClick={() => router.push(`/instructor/courses/${createdCourseId}`)}>
                  Hoàn tất
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Hãy hoàn thành bước Thông tin để tạo khóa học trước.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
