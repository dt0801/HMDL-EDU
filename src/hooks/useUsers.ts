"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/user.schema";
import type { ProfileWithDepartmentEmbed } from "@/types/database.types";

export function useUsers() {
  const supabase = createClient();
  return useQuery<ProfileWithDepartmentEmbed[]>({
    queryKey: ["users"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          email,
          role,
          department,
          department_id,
          avatar_url,
          phone,
          profile_completed_at,
          is_active,
          created_at,
          departments (
            id,
            name
          )
        `
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateUser() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUserInput & { id: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: input.full_name,
          role: input.role,
          department_id: input.department_id,
          department: input.department ?? null,
          is_active: input.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput): Promise<{ id: string }> => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Không tạo được người dùng");
      }
      return { id: json?.id ?? "" };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useToggleUserActive() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useAdminUpdateUserAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; email?: string; password?: string }) => {
      const res = await fetch(`/api/admin/users/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input.email, password: input.password }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Không cập nhật được tài khoản");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
