"use client";

import { Bell, BookOpen, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEnrollments } from "@/hooks/useEnrollments";
import {
  type CourseProgressSummary,
  useCourseProgressSummaries,
} from "@/hooks/useLessonProgress";
import { useCourses } from "@/hooks/useCourses";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Notification } from "@/types/database.types";

function InProgressCourse({
  course,
  progressSummary,
}: {
  course: { id: string; title: string; thumbnail_url: string | null; category: string | null };
  progressSummary?: CourseProgressSummary;
}) {
  const completedCount = progressSummary?.completedLessons ?? 0;
  const publishedCount = progressSummary?.publishedLessons ?? 0;
  const percent = progressSummary?.percent ?? 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium">{course.title}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {course.category ? <Badge variant="secondary">{course.category}</Badge> : null}
              <Badge variant="outline">Đang học</Badge>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link href={`/student/courses/${course.id}/learn`}>Tiếp tục</Link>
          </Button>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {completedCount}/{publishedCount} bài
            </span>
            <span className="font-medium">{percent}%</span>
          </div>
          <Progress value={percent} />
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentDashboardClient({ studentId }: { studentId: string }) {
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments(studentId);
  const { data: courses } = useCourses();
  const supabase = useMemo(() => createClient(), []);

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["my-notifications", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", studentId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const inProgress = useMemo(
    () => (enrollments ?? []).filter((enrollment) => enrollment.status === "active"),
    [enrollments]
  );
  const completed = useMemo(
    () => (enrollments ?? []).filter((enrollment) => enrollment.status === "completed"),
    [enrollments]
  );
  const inProgressCourseIds = useMemo(
    () => inProgress.map((enrollment) => enrollment.course_id),
    [inProgress]
  );
  const { data: progressSummaries } = useCourseProgressSummaries(studentId, inProgressCourseIds);
  const enrolledIds = useMemo(
    () => new Set((enrollments ?? []).map((enrollment) => enrollment.course_id)),
    [enrollments]
  );
  const suggested = useMemo(() => {
    return (courses ?? [])
      .filter((course) => course.is_published)
      .filter((course) => !enrolledIds.has(course.id))
      .slice(0, 3);
  }, [courses, enrolledIds]);

  return (
    <>
      <PageHeader title="Xin chào" description="Tổng quan các khóa học và chứng chỉ của bạn." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Đang học</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
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
            {enrollmentsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-semibold">{completed.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Thông báo</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-semibold">{notifications?.length ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Đang học</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/courses">Xem tất cả</Link>
          </Button>
        </div>

        {enrollmentsLoading ? (
          <Skeleton className="h-40 w-full" />
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
            {inProgress.map((enrollment) =>
              enrollment.course ? (
                <InProgressCourse
                  key={enrollment.id}
                  course={enrollment.course}
                  progressSummary={progressSummaries?.[enrollment.course.id]}
                />
              ) : null
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Khóa học đề xuất</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/courses">Xem thêm</Link>
          </Button>
        </div>

        {suggested.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Bạn đã đăng ký hết các khóa đang mở"
            description="Hãy quay lại sau khi có khóa học mới."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggested.map((course) => (
              <CourseCard
                key={course.id}
                course={{
                  id: course.id,
                  title: course.title,
                  description: course.description,
                  thumbnail_url: course.thumbnail_url,
                  category: course.category,
                  is_published: course.is_published,
                }}
                href="/student/courses"
                footer={<Badge variant="secondary">Đề xuất</Badge>}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Thông báo gần đây</h2>
          <span className="text-sm text-muted-foreground">Mới nhất</span>
        </div>

        {notificationsLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Chưa có thông báo nào" />
        ) : (
          <Card>
            <CardContent className="p-4 sm:p-6">
              <ul className="space-y-3">
                {notifications.map((notification, idx) => (
                  <li key={notification.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{notification.title}</p>
                        {notification.body ? (
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                            {notification.body}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(notification.created_at)}
                      </div>
                    </div>
                    {idx < notifications.length - 1 ? <Separator className="mt-3" /> : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
