"use client";

import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";

import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useCourses";

export function InstructorCoursesGrid({ instructorId }: { instructorId: string }) {
  const { data, isLoading } = useCourses({ instructorId });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Bạn chưa có khóa học nào"
        description="Bắt đầu bằng cách tạo khóa học đầu tiên của bạn."
        action={
          <Button asChild>
            <Link href="/instructor/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Tạo khóa học
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((c) => (
        <CourseCard key={c.id} course={c} href={`/instructor/courses/${c.id}`} />
      ))}
    </div>
  );
}
