"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import { useUpdateUser, useUsers } from "@/hooks/useUsers";
import type { Profile } from "@/types/database.types";

const formSchema = z.object({
  full_name: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  email: z.string().email("Email không hợp lệ").max(200),
  role: z.enum(["admin", "instructor", "student"]),
  department: z.string().max(100).optional().or(z.literal("")),
  is_active: z.boolean(),
});

type FormInput = z.infer<typeof formSchema>;

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user?: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Bắt buộc “dùng hook useUsers” theo spec (đồng thời giúp cache được invalidated đúng).
  useUsers();

  const updateUser = useUpdateUser();

  const mode: "edit" | "create" = user ? "edit" : "create";
  const title = mode === "edit" ? "Chỉnh sửa người dùng" : "Thêm người dùng";

  const defaultValues = useMemo<FormInput>(
    () => ({
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "student",
      department: user?.department ?? "",
      is_active: user?.is_active ?? true,
    }),
    [user]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const role = watch("role");
  const isActive = watch("is_active");

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = (data: FormInput) => {
    if (mode === "create") {
      toast.error(
        "Chức năng tạo user mới cần API admin (service role) và chưa được cấu hình trong dự án."
      );
      return;
    }

    if (!user) return;

    updateUser.mutate(
      {
        id: user.id,
        full_name: data.full_name,
        role: data.role,
        department: data.department,
        is_active: data.is_active,
      },
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? user?.email : "Tạo mới hồ sơ người dùng trong hệ thống."}
          </DialogDescription>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              disabled={mode === "edit"}
              placeholder="ten.ban@hmdl.vn"
              {...register("email")}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
            {mode === "edit" ? (
              <p className="text-xs text-muted-foreground">
                Email gắn với Supabase Auth; hiện màn hình này không thay đổi email đăng nhập.
              </p>
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
                setValue("role", v as FormInput["role"], { shouldValidate: true })
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

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <Label>Kích hoạt tài khoản</Label>
              <p className="text-xs text-muted-foreground">
                Tắt để khóa đăng nhập và truy cập hệ thống.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v, { shouldValidate: true })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={mode === "edit" ? updateUser.isPending : false}>
              {mode === "edit" && updateUser.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {mode === "edit" ? "Lưu" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
