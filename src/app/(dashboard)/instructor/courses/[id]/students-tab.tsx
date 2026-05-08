"use client";

import { Users } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCourseEnrollments } from "@/hooks/useEnrollments";
import { formatDate } from "@/lib/utils";

export function StudentsTab({ courseId }: { courseId: string }) {
  const { data, isLoading } = useCourseEnrollments(courseId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={Users}
            title="Chưa có học viên đăng ký"
            description="Khóa học cần được xuất bản để học viên đăng ký."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Khoa</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.student?.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{e.student?.email ?? "—"}</TableCell>
                <TableCell>{e.student?.department ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      e.status === "completed"
                        ? "success"
                        : e.status === "dropped"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {e.status === "completed"
                      ? "Đã hoàn thành"
                      : e.status === "dropped"
                        ? "Đã bỏ học"
                        : "Đang học"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(e.enrolled_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
