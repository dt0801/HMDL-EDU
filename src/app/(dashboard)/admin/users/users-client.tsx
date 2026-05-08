"use client";

import { Pencil, Search, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToggleUserActive, useUsers } from "@/hooks/useUsers";
import { formatDate, roleLabel } from "@/lib/utils";
import type { Profile } from "@/types/database.types";

import { EditUserDialog } from "./edit-user-dialog";

export function UsersClient() {
  const { data: users, isLoading } = useUsers();
  const toggleActive = useToggleUserActive();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Profile | null>(null);

  const filtered = useMemo(() => {
    const list = users ?? [];
    return list.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.department ?? "").toLowerCase().includes(s)
      );
    });
  }, [users, search, roleFilter]);

  return (
    <>
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản nhân viên y tế trong hệ thống đào tạo."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, khoa..."
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                <SelectItem value="admin">Quản trị viên</SelectItem>
                <SelectItem value="instructor">Giảng viên</SelectItem>
                <SelectItem value="student">Học viên</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="Không có người dùng nào khớp bộ lọc" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Khoa</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.department ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {roleLabel(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="success">Hoạt động</Badge>
                      ) : (
                        <Badge variant="destructive">Đã khóa</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(u)}
                          aria-label="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            toggleActive.mutate({ id: u.id, is_active: !u.is_active })
                          }
                          disabled={toggleActive.isPending}
                          aria-label={u.is_active ? "Khóa tài khoản" : "Mở khóa"}
                        >
                          {u.is_active ? (
                            <ShieldAlert className="h-4 w-4 text-destructive" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          )}
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

      {editing ? (
        <EditUserDialog user={editing} open onOpenChange={(o) => !o && setEditing(null)} />
      ) : null}
    </>
  );
}
