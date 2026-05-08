"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useExamsByCourse } from "@/hooks/useExams";
import { formatDate } from "@/lib/utils";

export function ExamsTab({ courseId }: { courseId: string }) {
  const { data, isLoading } = useExamsByCourse(courseId);

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Quản lý các đề thi của khóa học.</p>
          <Button asChild size="sm">
            <Link href={`/instructor/exams/new?courseId=${courseId}`}>
              <Plus className="mr-1 h-4 w-4" /> Tạo đề thi
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Chưa có đề thi"
            description="Bạn có thể tạo đề thi gắn với khóa học này."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đề thi</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Điểm đạt</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tạo lúc</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{e.duration_minutes} phút</TableCell>
                  <TableCell>{e.passing_score}%</TableCell>
                  <TableCell>
                    {e.is_published ? (
                      <Badge variant="success">Đã xuất bản</Badge>
                    ) : (
                      <Badge variant="secondary">Bản nháp</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(e.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/instructor/exams/${e.id}`}>Mở</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
