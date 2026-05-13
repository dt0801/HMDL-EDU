"use client";

import { Award } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
import { useAdminCertificates } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/utils";

export function AdminCertificatesClient() {
  const { data, isLoading } = useAdminCertificates();

  return (
    <>
      <PageHeader
        title="Chứng chỉ"
        description="Danh sách chứng chỉ đã cấp cho học viên."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data || data.length === 0 ? (
            <EmptyState icon={Award} title="Chưa có chứng chỉ" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số chứng chỉ</TableHead>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Ngày cấp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.cert_number}</TableCell>
                    <TableCell>{c.student?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.student?.email ?? "—"}</TableCell>
                    <TableCell>{c.course?.title ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(c.issued_at)}
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

