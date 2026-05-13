"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Certificate, CertificateTemplate, Course, Json } from "@/types/database.types";

export type CertificateTemplateWithCourse = CertificateTemplate & {
  course: Pick<Course, "id" | "title"> | null;
};

export type CertificateIssueResult = Certificate & {
  certificateCode: string;
  pdfUrl: string;
  imageUrl: string | null;
};

async function apiRequest<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Yêu cầu thất bại.";
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function useCertificateTemplates() {
  const supabase = createClient();
  return useQuery<CertificateTemplateWithCourse[]>({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*, course:courses(id, title)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CertificateTemplateWithCourse[];
    },
  });
}

export function useCreateCertificateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      courseId?: string | null;
      canvasJSON: Json;
      width?: number;
      height?: number;
    }) =>
      apiRequest<CertificateTemplate>("/api/certificate/templates", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificate-templates"] }),
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; courseId: string; templateId?: string | null }) =>
      apiRequest<CertificateIssueResult>("/api/certificate/issue", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "certificates"] });
      qc.invalidateQueries({ queryKey: ["my-certificates"] });
      qc.invalidateQueries({ queryKey: ["instructor-certificates"] });
    },
  });
}

