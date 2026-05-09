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
    <div className="space-y-6 pb-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 shrink-0">
        <Link href="/instructor/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Khóa học của tôi
        </Link>
      </Button>

      <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)} className="space-y-6">
        <Stepper
          value={step}
          onValueChange={(k) => setStep(k as typeof step)}
          items={[
            { key: "info", label: "Bước 1", description: "Thông tin" },
            { key: "lessons", label: "Bước 2", description: "Bài học", disabled: !createdCourseId },
            { key: "exams", label: "Bước 3", description: "Đề thi", disabled: !createdCourseId },
          ]}
        />

        <TabsContent value="info" className="mt-0 focus-visible:outline-none">
          <div className="mx-auto max-w-2xl space-y-4 pt-1">
            <div className="border-b pb-3">
              <h2 className="text-base font-semibold">Thông tin khóa học</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Điền nội dung cơ bản. Sau khi bấm &quot;Tạo khóa học&quot;, bạn sẽ sang bước thêm bài học.
              </p>
            </div>
            <CourseForm
              onSubmit={onSubmit}
              isSubmitting={createCourse.isPending}
              submitLabel="Tạo khóa học"
            />
          </div>
        </TabsContent>

        <TabsContent value="lessons" className="mt-0 space-y-4 focus-visible:outline-none">
          {createdCourseId ? (
            <>
              <div className="mx-auto max-w-3xl border-b pb-3">
                <h2 className="text-base font-semibold">Bài học</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thêm và sắp xếp bài học. Hoàn tất thì chuyển sang bước đề thi.
                </p>
              </div>
              <LessonsTab courseId={createdCourseId} />
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setStep("info")}>
                  Quay lại
                </Button>
                <Button type="button" onClick={() => setStep("exams")}>
                  Tiếp tục đến đề thi
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

        <TabsContent value="exams" className="mt-0 space-y-4 focus-visible:outline-none">
          {createdCourseId ? (
            <>
              <div className="mx-auto max-w-3xl border-b pb-3">
                <h2 className="text-base font-semibold">Đề thi</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tạo đề thi hoặc upload câu hỏi cho khóa học này.
                </p>
              </div>
              <ExamsTab courseId={createdCourseId} />
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setStep("lessons")}>
                  Quay lại
                </Button>
                <Button type="button" onClick={() => router.push(`/instructor/courses/${createdCourseId}`)}>
                  Hoàn tất và xem khóa học
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
