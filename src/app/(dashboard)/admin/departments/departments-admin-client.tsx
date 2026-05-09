"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from "@/hooks/useDepartments";
import { formatDate } from "@/lib/utils";
import type { Department } from "@/types/database.types";

const deptFormSchema = z.object({
  name: z.string().min(1, "Nhập tên phòng ban").max(200),
  code: z.string().max(50).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(999999),
});

type DeptFormInput = z.infer<typeof deptFormSchema>;

export function DepartmentsAdminClient() {
  const { data: departments, isLoading } = useDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const form = useForm<DeptFormInput>({
    resolver: zodResolver(deptFormSchema),
    defaultValues: { name: "", code: "", sort_order: 0 },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  useEffect(() => {
    if (dialogOpen && editing) {
      form.reset({
        name: editing.name,
        code: editing.code ?? "",
        sort_order: editing.sort_order,
      });
    } else if (dialogOpen && !editing) {
      form.reset({ name: "", code: "", sort_order: 0 });
    }
  }, [dialogOpen, editing, form]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setDialogOpen(true);
  };

  const onSubmit = (data: DeptFormInput) => {
    const payload = {
      name: data.name.trim(),
      code: data.code?.trim() || null,
      sort_order: data.sort_order,
    };

    if (editing) {
      updateDept.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật phòng ban");
            setDialogOpen(false);
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Lưu thất bại"),
        }
      );
      return;
    }

    createDept.mutate(payload, {
      onSuccess: () => {
        toast.success("Đã thêm phòng ban");
        setDialogOpen(false);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Tạo thất bại"),
    });
  };

  const busy = createDept.isPending || updateDept.isPending;

  return (
    <>
      <PageHeader
        title="Khoa / Phòng ban"
        description="Danh mục đơn vị để gán cho người dùng và (sau này) khóa học, báo cáo."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm phòng ban
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : !departments || departments.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Chưa có phòng ban"
              description="Thêm đơn vị (ví dụ Khoa Nội tim mạch) để gán cho nhân sự trong trang Người dùng."
              action={
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm phòng ban
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead className="w-28">Thứ tự</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.code ?? "—"}</TableCell>
                    <TableCell>{d.sort_order}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteDept.isPending}
                          onClick={() => {
                            if (!confirm(`Xóa phòng ban "${d.name}"? Người dùng đang gán sẽ mất liên kết.`))
                              return;
                            deleteDept.mutate(d.id, {
                              onSuccess: () => toast.success("Đã xóa phòng ban"),
                              onError: (e) =>
                                toast.error(e instanceof Error ? e.message : "Xóa thất bại"),
                            });
                          }}
                        >
                          {deleteDept.isPending ? (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa phòng ban" : "Thêm phòng ban"}</DialogTitle>
            <DialogDescription>
              Tên hiển thị khi gán người dùng; mã ngắn (tuỳ chọn) để báo cáo sau này.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="dept-name">Tên phòng ban</Label>
              <Input id="dept-name" {...form.register("name")} placeholder="Ví dụ: Khoa Nội tim mạch" />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code">Mã (tuỳ chọn)</Label>
              <Input id="dept-code" {...form.register("code")} placeholder="VD: NTMT" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-order">Thứ tự hiển thị</Label>
              <Input id="dept-order" type="number" min={0} {...form.register("sort_order")} />
              {form.formState.errors.sort_order ? (
                <p className="text-sm text-destructive">{form.formState.errors.sort_order.message}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
