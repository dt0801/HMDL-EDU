"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database.types";

export function useCurrentProfile() {
  const supabase = createClient();

  return useQuery<Profile | null>({
    queryKey: ["current-profile"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, department, department_id, avatar_url, phone, profile_completed_at, is_active, created_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
