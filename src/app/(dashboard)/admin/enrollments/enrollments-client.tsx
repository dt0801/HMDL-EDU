"use client";

import { GraduationCap } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
import { useAdminEnrollments } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/utils";

export function AdminEnrollmentsClient() {
  const { data, isLoading } = useAdminEnrollments();

  return (
    <>
      <PageHeader
        title="Ghi danh học viên"
        description="Danh sách ghi danh trong toàn hệ thống."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data || data.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Chưa có ghi danh" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ghi danh lúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.student?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.student?.email ?? "—"}</TableCell>
                    <TableCell>{e.course?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "completed" ? "success" : "secondary"}>
                        {e.status === "completed" ? "Hoàn thành" : "Đang học"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(e.enrolled_at)}</TableCell>
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

