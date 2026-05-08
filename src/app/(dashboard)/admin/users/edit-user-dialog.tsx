"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateUser } from "@/hooks/useUsers";
import { updateUserSchema, type UpdateUserInput } from "@/lib/validations/user.schema";
import type { Profile } from "@/types/database.types";

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateUser = useUpdateUser();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      full_name: user.full_name,
      role: user.role,
      department: user.department ?? "",
      is_active: user.is_active,
    },
  });

  const role = watch("role");
  const isActive = watch("is_active");

  const onSubmit = (data: UpdateUserInput) => {
    updateUser.mutate(
      { id: user.id, ...data },
      {
        onSuccess: () => {
          toast.success("Cập nhật người dùng thành công");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên</Label>
            <Input id="full_name" {...register("full_name")} />
            {errors.full_name ? (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Khoa/phòng ban</Label>
            <Input id="department" {...register("department")} />
          </div>

          <div className="space-y-2">
            <Label>Vai trò</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setValue("role", v as UpdateUserInput["role"], { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Quản trị viên</SelectItem>
                <SelectItem value="instructor">Giảng viên</SelectItem>
                <SelectItem value="student">Học viên</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select
              value={isActive ? "active" : "inactive"}
              onValueChange={(v) => setValue("is_active", v === "active", { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="inactive">Đã khóa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
