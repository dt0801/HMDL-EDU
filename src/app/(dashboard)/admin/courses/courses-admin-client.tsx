"use client";

import { Library } from "lucide-react";

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
import { useCourses, useToggleCoursePublish } from "@/hooks/useCourses";
import { formatDate } from "@/lib/utils";

export function CoursesAdminClient() {
  const { data: courses, isLoading } = useCourses();
  const toggle = useToggleCoursePublish();

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
                      <Button
                        size="sm"
                        variant={c.is_published ? "outline" : "default"}
                        onClick={() => toggle.mutate({ id: c.id, is_published: !c.is_published })}
                        disabled={toggle.isPending}
                      >
                        {c.is_published ? "Hủy xuất bản" : "Xuất bản"}
                      </Button>
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
