"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
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
import { useDepartments } from "@/hooks/useDepartments";
import { useAdminUpdateUserAuth, useCreateUser, useUpdateUser, useUsers } from "@/hooks/useUsers";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user.schema";
import type { ProfileWithDepartmentEmbed } from "@/types/database.types";

const baseSchema = updateUserSchema.omit({ department: true }).extend({
  email: z.string().email("Email không hợp lệ").max(200),
  department_id: z.union([z.string().uuid(), z.literal("")]).optional(),
  password: z.string().optional().or(z.literal("")),
});

type FormInput = z.infer<typeof baseSchema>;

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user?: ProfileWithDepartmentEmbed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useUsers();
  const { data: departments } = useDepartments();

  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const updateAuthUser = useAdminUpdateUserAuth();

  const mode: "edit" | "create" = user ? "edit" : "create";
  const title = mode === "edit" ? "Chỉnh sửa người dùng" : "Thêm người dùng";

  const defaultValues = useMemo<FormInput>(
    () => ({
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "student",
      department_id: user?.department_id ?? "",
      is_active: user?.is_active ?? true,
      password: "",
    }),
    [user]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(baseSchema),
    defaultValues,
  });

  const role = useWatch({ control, name: "role" });
  const departmentId = useWatch({ control, name: "department_id" });
  const isActive = useWatch({ control, name: "is_active" });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = async (data: FormInput) => {
    const deptId =
      data.department_id && data.department_id !== "" ? data.department_id : null;
    const deptName = deptId
      ? (departments ?? []).find((d) => d.id === deptId)?.name ?? null
      : null;

    if (mode === "create") {
      const parsed = createUserSchema.safeParse({
        full_name: data.full_name,
        email: data.email,
        password: data.password ?? "",
        role: data.role,
        department_id: deptId ?? "",
        department: deptName,
        is_active: data.is_active,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
        return;
      }

      createUser.mutate(parsed.data, {
        onSuccess: () => {
          toast.success("Tạo người dùng thành công");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra"),
      });
      return;
    }

    if (!user) return;

    // Update Auth (email/password) via server if needed.
    try {
      const nextEmail = data.email?.trim();
      const nextPassword = data.password?.trim();
      const shouldUpdateEmail = !!nextEmail && nextEmail !== user.email;
      const shouldUpdatePassword = !!nextPassword;
      if (shouldUpdateEmail || shouldUpdatePassword) {
        await updateAuthUser.mutateAsync({
          id: user.id,
          email: shouldUpdateEmail ? nextEmail : undefined,
          password: shouldUpdatePassword ? nextPassword : undefined,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không cập nhật được email/mật khẩu");
      return;
    }

    const parsed = updateUserSchema.parse({
      full_name: data.full_name,
      role: data.role,
      department_id: deptId ?? "",
      department: deptName,
      is_active: data.is_active,
    });

    updateUser.mutate(
      {
        id: user.id,
        ...parsed,
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

  const isPending =
    mode === "edit"
      ? updateUser.isPending || updateAuthUser.isPending
      : createUser.isPending;

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
              placeholder="ten.ban@hmdl.vn"
              {...register("email")}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
            {mode === "edit" ? (
              <p className="text-xs text-muted-foreground">
                Thay email sẽ cập nhật cả Supabase Auth và hồ sơ trong hệ thống.
              </p>
            ) : null}
          </div>

          {mode === "create" ? (
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu khởi tạo</Label>
              <Input
                id="password"
                type="text"
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Hãy gửi mật khẩu này cho người dùng và nhắc họ đổi sau lần đăng nhập đầu tiên.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="password">Đặt lại mật khẩu (tùy chọn)</Label>
              <Input
                id="password"
                type="text"
                placeholder="Để trống nếu không đổi"
                autoComplete="new-password"
                {...register("password")}
              />
              <p className="text-xs text-muted-foreground">
                Nếu nhập, mật khẩu sẽ được cập nhật ngay vào Supabase Auth.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Khoa/phòng ban</Label>
            <Select
              value={departmentId === "" || departmentId === undefined ? "__none__" : departmentId}
              onValueChange={(v) =>
                setValue("department_id", v === "__none__" ? "" : v, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Không gán —</SelectItem>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Quản lý danh mục tại trang Khoa / Phòng ban.
            </p>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "edit" ? "Lưu" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
