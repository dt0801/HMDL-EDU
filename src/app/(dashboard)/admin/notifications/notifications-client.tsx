"use client";

import { Bell } from "lucide-react";

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
import { useAdminNotifications } from "@/hooks/useAdminData";
import { formatDateTime, roleLabel } from "@/lib/utils";

export function AdminNotificationsClient() {
  const { data, isLoading } = useAdminNotifications();

  return (
    <>
      <PageHeader
        title="Thông báo"
        description="Danh sách thông báo đã gửi trong hệ thống."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data || data.length === 0 ? (
            <EmptyState icon={Bell} title="Chưa có thông báo" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Gửi lúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {n.user?.full_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {n.user?.role ? (
                        <Badge variant="outline">{roleLabel(n.user.role)}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {n.is_read ? <Badge variant="secondary">Đã đọc</Badge> : <Badge variant="success">Chưa đọc</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(n.created_at)}
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

