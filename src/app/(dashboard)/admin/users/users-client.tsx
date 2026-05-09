"use client";

import { Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDepartments } from "@/hooks/useDepartments";
import { useToggleUserActive, useUsers } from "@/hooks/useUsers";
import { getInitials, roleLabel } from "@/lib/utils";
import type { Profile, ProfileWithDepartmentEmbed } from "@/types/database.types";

import { EditUserDialog } from "./edit-user-dialog";

function roleBadgeVariant(role: Profile["role"]): React.ComponentProps<typeof Badge>["variant"] {
  switch (role) {
    case "admin":
      return "default";
    case "instructor":
      return "warning";
    case "student":
      return "secondary";
    default:
      return "secondary";
  }
}

function departmentDisplayName(u: ProfileWithDepartmentEmbed): string {
  return u.departments?.name ?? u.department ?? "";
}

export function UsersClient() {
  const { data: users, isLoading } = useUsers();
  const { data: departmentList } = useDepartments();
  const toggleActive = useToggleUserActive();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [editing, setEditing] = useState<ProfileWithDepartmentEmbed | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = users ?? [];
    return list.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (departmentFilter === "__none__") {
        if (u.department_id != null) return false;
      } else if (departmentFilter !== "all" && u.department_id !== departmentFilter) {
        return false;
      }
      if (!search) return true;
      const s = search.toLowerCase();
      const deptLabel = departmentDisplayName(u).toLowerCase();
      return (
        u.full_name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        deptLabel.includes(s)
      );
    });
  }, [users, search, roleFilter, departmentFilter]);

  return (
    <>
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản nhân viên y tế trong hệ thống đào tạo."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, khoa..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-none">
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

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="Khoa/phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khoa</SelectItem>
                  <SelectItem value="__none__">Chưa gán phòng ban</SelectItem>
                  {(departmentList ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button className="sm:w-auto" onClick={() => setCreateOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Thêm user
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="Không có người dùng nào khớp bộ lọc" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Khoa</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="text-right">Kích hoạt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer"
                    onClick={() => setEditing(u)}
                  >
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar_url ?? undefined} alt={u.full_name} />
                        <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{departmentDisplayName(u) || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(u.role)}>{roleLabel(u.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Switch
                          checked={u.is_active}
                          disabled={toggleActive.isPending}
                          onCheckedChange={(checked) =>
                            toggleActive.mutate({ id: u.id, is_active: checked })
                          }
                          onClick={(e) => e.stopPropagation()}
                          aria-label={u.is_active ? "Tắt tài khoản" : "Bật tài khoản"}
                        />
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

      {createOpen ? (
        <EditUserDialog open onOpenChange={(o) => !o && setCreateOpen(false)} />
      ) : null}
    </>
  );
}
