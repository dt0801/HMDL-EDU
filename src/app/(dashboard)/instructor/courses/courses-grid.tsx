"use client";

import { BookOpen, Loader2, Pencil, Trash2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses, useDeleteCourse } from "@/hooks/useCourses";

export function InstructorCoursesGrid({
  instructorId,
  isAdmin = false,
}: {
  instructorId?: string;
  isAdmin?: boolean;
}) {
  const { data, isLoading } = useCourses({ instructorId });
  const deleteCourse = useDeleteCourse();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        title={isAdmin ? "Chưa có khóa học nào" : "Bạn chưa có khóa học nào"}
        description={
          isAdmin
            ? "Tạo khóa học đầu tiên để bắt đầu thêm bài học và đề thi trắc nghiệm."
            : "Bắt đầu bằng cách tạo khóa học đầu tiên của bạn."
        }
        action={
          <Button asChild>
            <Link href="/instructor/courses/new">Tạo khóa học</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((c) => (
        <Card key={c.id} className="group overflow-hidden transition-shadow hover:shadow-md">
          <Link href={`/instructor/courses/${c.id}`} className="block">
            <div className="relative aspect-video bg-muted">
              {c.thumbnail_url ? (
                <Image
                  src={c.thumbnail_url}
                  alt={c.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-sky-100" />
              )}

              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {c.category ? <Badge variant="secondary">{c.category}</Badge> : null}
                {c.is_published ? (
                  <Badge variant="success">Đã xuất bản</Badge>
                ) : (
                  <Badge variant="warning">Bản nháp</Badge>
                )}
              </div>
            </div>
          </Link>

          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/instructor/courses/${c.id}`} className="min-w-0 flex-1">
                <h3 className="line-clamp-2 font-semibold transition-colors group-hover:text-primary">
                  {c.title}
                </h3>
              </Link>

              <div className="-mr-2 -mt-1 flex items-center">
                <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                  <Link href={`/instructor/courses/${c.id}`} aria-label="Chỉnh sửa khóa học">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label="Xóa khóa học"
                  disabled={deleteCourse.isPending && deletingId === c.id}
                  onClick={() => {
                    const msg = c.is_published
                      ? `Khóa học đang xuất bản. Xóa sẽ mất toàn bộ bài học/đề thi liên quan. Bạn chắc chắn muốn xóa "${c.title}"?`
                      : `Xóa khóa học "${c.title}"?`;
                    if (!confirm(msg)) return;
                    setDeletingId(c.id);
                    deleteCourse.mutate(c.id, {
                      onSuccess: () => toast.success("Đã xóa khóa học"),
                      onError: (e) =>
                        toast.error(e instanceof Error ? e.message : "Xóa thất bại"),
                      onSettled: () => setDeletingId(null),
                    });
                  }}
                >
                  {deleteCourse.isPending && deletingId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            </div>

            {c.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
            ) : null}

            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{c.enrollments_count ?? 0} học viên</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
