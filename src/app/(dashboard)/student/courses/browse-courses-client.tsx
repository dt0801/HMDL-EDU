"use client";

import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useCourses";
import { useEnroll, useMyEnrollments } from "@/hooks/useEnrollments";
import { COURSE_CATEGORIES } from "@/lib/validations/course.schema";

export function BrowseCoursesClient({ studentId }: { studentId: string }) {
  const { data: courses, isLoading } = useCourses();
  const { data: myEnrollments } = useMyEnrollments(studentId);
  const enroll = useEnroll();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const enrolledIds = useMemo(
    () => new Set((myEnrollments ?? []).map((e) => e.course_id)),
    [myEnrollments]
  );

  const filtered = useMemo(() => {
    return (courses ?? [])
      .filter((c) => c.is_published)
      .filter((c) => {
        if (category !== "all" && c.category !== category) return false;
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(s) ||
          (c.description ?? "").toLowerCase().includes(s)
        );
      });
  }, [courses, search, category]);

  return (
    <>
      <PageHeader
        title="Khám phá khóa học"
        description="Tất cả các khóa đào tạo nội bộ đang mở."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả..."
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Chuyên khoa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chuyên khoa</SelectItem>
            {COURSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Không có khóa học nào khớp"
          description="Thử bỏ bộ lọc hoặc đổi từ khóa tìm kiếm."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const isEnrolled = enrolledIds.has(c.id);
            return (
              <CourseCard
                key={c.id}
                course={c}
                href={isEnrolled ? `/student/courses/${c.id}/learn` : "#"}
                footer={
                  isEnrolled ? (
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <Link href={`/student/courses/${c.id}/learn`}>Tiếp tục học</Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={enroll.isPending}
                      onClick={() =>
                        enroll.mutate(
                          { studentId, courseId: c.id },
                          {
                            onSuccess: () => toast.success("Đăng ký thành công"),
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra"),
                          }
                        )
                      }
                    >
                      Đăng ký học
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}
