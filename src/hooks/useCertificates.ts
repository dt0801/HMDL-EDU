"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Certificate } from "@/types/database.types";

export type CertificateWithCourse = Certificate & {
  course: { id: string; title: string; category: string | null } | null;
};

export function useMyCertificates(studentId: string | undefined) {
  const supabase = createClient();
  return useQuery<CertificateWithCourse[]>({
    queryKey: ["my-certificates", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, course:courses(id, title, category)")
        .eq("student_id", studentId!)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CertificateWithCourse[];
    },
  });
}
