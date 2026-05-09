"use client";

import { Library, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCourses, useDeleteCourse, useToggleCoursePublish } from "@/hooks/useCourses";
import { formatDate } from "@/lib/utils";

export function CoursesAdminClient() {
  const { data: courses, isLoading } = useCourses();
  const toggle = useToggleCoursePublish();
  const deleteCourse = useDeleteCourse();
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Quản lý khóa học"
        description="Tổng quan toàn bộ khóa học trong hệ thống và bật/tắt xuất bản."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : !courses || courses.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Chưa có khóa học nào"
              description="Khi giảng viên tạo khóa học, danh sách sẽ hiển thị tại đây."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Chuyên khoa</TableHead>
                  <TableHead>Giảng viên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.instructor?.full_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {c.is_published ? (
                        <Badge variant="success">Đã xuất bản</Badge>
                      ) : (
                        <Badge variant="secondary">Bản nháp</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant={c.is_published ? "outline" : "default"}
                          onClick={() => {
                            setBusyId(c.id);
                            toggle.mutate(
                              { id: c.id, is_published: !c.is_published },
                              { onSettled: () => setBusyId(null) }
                            );
                          }}
                          disabled={(toggle.isPending && busyId === c.id) || deleteCourse.isPending}
                        >
                          {toggle.isPending && busyId === c.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {c.is_published ? "Hủy xuất bản" : "Xuất bản"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={toggle.isPending || (deleteCourse.isPending && busyId === c.id)}
                          onClick={() => {
                            const msg = c.is_published
                              ? `Khóa học đang xuất bản. Xóa sẽ mất toàn bộ bài học/đề thi liên quan. Bạn chắc chắn muốn xóa "${c.title}"?`
                              : `Xóa khóa học "${c.title}"?`;
                            if (!confirm(msg)) return;
                            setBusyId(c.id);
                            deleteCourse.mutate(c.id, {
                              onSuccess: () => toast.success("Đã xóa khóa học"),
                              onError: (e) =>
                                toast.error(e instanceof Error ? e.message : "Xóa thất bại"),
                              onSettled: () => setBusyId(null),
                            });
                          }}
                        >
                          {deleteCourse.isPending && busyId === c.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                          )}
                          Xóa
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
