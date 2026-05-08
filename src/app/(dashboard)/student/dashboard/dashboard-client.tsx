"use client";

import { Award, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";

import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCertificates } from "@/hooks/useCertificates";
import { useMyEnrollments } from "@/hooks/useEnrollments";

export function StudentDashboardClient({ studentId }: { studentId: string }) {
  const { data: enrollments, isLoading: eLoading } = useMyEnrollments(studentId);
  const { data: certificates, isLoading: cLoading } = useMyCertificates(studentId);

  const inProgress = (enrollments ?? []).filter((e) => e.status === "active");
  const completed = (enrollments ?? []).filter((e) => e.status === "completed");

  return (
    <>
      <PageHeader
        title="Xin chào"
        description="Tổng quan các khóa học và chứng chỉ của bạn."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Đang học</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {eLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-semibold">{inProgress.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoàn thành</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {eLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-semibold">{completed.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chứng chỉ</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {cLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-semibold">{certificates?.length ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Khóa học đang học</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/courses">Xem tất cả</Link>
          </Button>
        </div>

        {eLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-[4/3]" />
            ))}
          </div>
        ) : inProgress.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Bạn chưa đăng ký khóa học nào"
            description="Khám phá các khóa đào tạo nội bộ để bắt đầu."
            action={
              <Button asChild>
                <Link href="/student/courses">Khám phá khóa học</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((e) =>
              e.course ? (
                <CourseCard
                  key={e.id}
                  course={{
                    id: e.course.id,
                    title: e.course.title,
                    description: null,
                    thumbnail_url: e.course.thumbnail_url,
                    category: e.course.category,
                    is_published: true,
                  }}
                  href={`/student/courses/${e.course.id}/learn`}
                  footer={<Badge variant="secondary">Đang học</Badge>}
                />
              ) : null
            )}
          </div>
        )}
      </div>
    </>
  );
}
