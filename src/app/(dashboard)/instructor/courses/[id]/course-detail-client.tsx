"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { CourseForm } from "@/components/courses/course-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourse, useUpdateCourse } from "@/hooks/useCourses";
import type { CourseInput } from "@/lib/validations/course.schema";

import { DocumentsTab } from "./documents-tab";
import { ExamsTab } from "./exams-tab";
import { LiveSessionsTab } from "./live-sessions-tab";
import { LessonsTab } from "./lessons-tab";
import { StudentsTab } from "./students-tab";

export function CourseDetailClient({ courseId }: { courseId: string }) {
  const { data: course, isLoading } = useCourse(courseId);
  const updateCourse = useUpdateCourse();

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!course) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          Không tìm thấy khóa học.
        </CardContent>
      </Card>
    );
  }

  const onSubmit = (input: CourseInput) => {
    updateCourse.mutate(
      { id: course.id, ...input },
      {
        onSuccess: () => toast.success("Đã cập nhật khóa học"),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra"),
      }
    );
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link href="/instructor/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Khóa học của tôi
        </Link>
      </Button>

      <PageHeader
        title={course.title}
        description={course.category ?? undefined}
        actions={
          course.is_published ? (
            <Badge variant="success">Đã xuất bản</Badge>
          ) : (
            <Badge variant="warning">Bản nháp</Badge>
          )
        }
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="lessons">Bài học</TabsTrigger>
          <TabsTrigger value="live-sessions">Trực tuyến</TabsTrigger>
          <TabsTrigger value="documents">Tài liệu</TabsTrigger>
          <TabsTrigger value="exams">Đề thi</TabsTrigger>
          <TabsTrigger value="students">Học viên</TabsTrigger>
        </TabsList>

        <TabsContent value="info" forceMount>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <CourseForm
                defaultValues={{
                  title: course.title,
                  description: course.description ?? "",
                  category: course.category ?? "",
                  thumbnail_url: course.thumbnail_url ?? "",
                  is_published: course.is_published,
                  requires_enrollment: course.requires_enrollment,
                }}
                onSubmit={onSubmit}
                isSubmitting={updateCourse.isPending}
                submitLabel="Lưu thay đổi"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" forceMount>
          <LessonsTab courseId={course.id} />
        </TabsContent>

        <TabsContent value="live-sessions" forceMount>
          <LiveSessionsTab courseId={course.id} />
        </TabsContent>

        <TabsContent value="documents" forceMount>
          <DocumentsTab courseId={course.id} />
        </TabsContent>

        <TabsContent value="exams" forceMount>
          <ExamsTab courseId={course.id} />
        </TabsContent>

        <TabsContent value="students" forceMount>
          <StudentsTab courseId={course.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
