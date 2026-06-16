"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
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
import { useDepartments } from "@/hooks/useDepartments";
import { createClient } from "@/lib/supabase/client";
import {
  profileOnboardingSchema,
  type ProfileOnboardingInput,
} from "@/lib/validations/profile-onboarding.schema";
import type { Profile } from "@/types/database.types";

export function ProfileOnboardingDialog({
  profile,
  open,
}: {
  profile: Profile;
  open: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { data: departments, isLoading: deptLoading } = useDepartments();

  const defaultValues = useMemo<ProfileOnboardingInput>(
    () => ({
      full_name: profile.full_name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      department_id: profile.department_id ?? "",
    }),
    [profile]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileOnboardingInput>({
    resolver: zodResolver(profileOnboardingSchema),
    defaultValues,
  });

  const departmentId = useWatch({ control, name: "department_id" });

  const onSubmit = async (data: ProfileOnboardingInput) => {
    const deptId = data.department_id;
    const deptName =
      deptId && deptId !== "" ? (departments ?? []).find((d) => d.id === deptId)?.name ?? null : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        department_id: deptId,
        department: deptName,
        profile_completed_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      toast.error(error.message || "Không lưu được hồ sơ");
      return;
    }

    toast.success("Đã cập nhật hồ sơ");
    router.refresh();
  };

  const noDepartments = !deptLoading && (departments?.length ?? 0) === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) return;
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Hoàn tất hồ sơ</DialogTitle>
          <DialogDescription>
            Vui lòng điền thông tin cơ bản để tiếp tục sử dụng hệ thống. Áp dụng cho mọi vai trò.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="onboard-full_name">Họ và tên</Label>
            <Input id="onboard-full_name" autoComplete="name" {...register("full_name")} />
            {errors.full_name ? (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="onboard-email">Email</Label>
            <Input id="onboard-email" type="email" autoComplete="email" {...register("email")} />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="onboard-phone">Số điện thoại</Label>
            <Input id="onboard-phone" type="tel" autoComplete="tel" {...register("phone")} />
            {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label>Phòng ban / Khoa</Label>
            <Select
              value={departmentId || undefined}
              onValueChange={(v) => setValue("department_id", v, { shouldValidate: true })}
              disabled={deptLoading || noDepartments}
            >
              <SelectTrigger aria-label="Phòng ban">
                <SelectValue placeholder={deptLoading ? "Đang tải…" : "Chọn phòng ban"} />
              </SelectTrigger>
              <SelectContent>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noDepartments ? (
              <p className="text-sm text-muted-foreground">
                Chưa có phòng ban trong hệ thống. Liên hệ quản trị để được thêm danh mục.
              </p>
            ) : null}
            {errors.department_id ? (
              <p className="text-sm text-destructive">{errors.department_id.message}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="submit" disabled={noDepartments || isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu…
                </>
              ) : (
                "Lưu và tiếp tục"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
