"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Certificate, CertificateTemplate, Course, Notification, Profile } from "@/types/database.types";

export type CertificateWithRefs = Certificate & {
  student: Pick<Profile, "id" | "full_name" | "email" | "department"> | null;
  course: Pick<Course, "id" | "title" | "category"> | null;
  template: Pick<CertificateTemplate, "id" | "name" | "canvas_json" | "width" | "height"> | null;
};

export type NotificationWithUser = Notification & {
  user: Pick<Profile, "id" | "full_name" | "email" | "role"> | null;
};

export type EnrollmentWithRefs = {
  id: string;
  student_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  student: Pick<Profile, "id" | "full_name" | "email" | "department"> | null;
  course: Pick<Course, "id" | "title" | "category"> | null;
};

export function useAdminCertificates() {
  const supabase = createClient();
  return useQuery<CertificateWithRefs[]>({
    queryKey: ["admin", "certificates"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, student_id, course_id, issued_at, cert_number, template_id, certificate_code, pdf_url, image_url, revoked_at, revoked_reason, student:profiles(id, full_name, email, department), course:courses(id, title, category), template:certificate_templates(id, name, canvas_json, width, height)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CertificateWithRefs[];
    },
  });
}

export function useAdminNotifications() {
  const supabase = createClient();
  return useQuery<NotificationWithUser[]>({
    queryKey: ["admin", "notifications"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, title, body, is_read, link, created_at, user:profiles(id, full_name, email, role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NotificationWithUser[];
    },
  });
}

export function useAdminEnrollments() {
  const supabase = createClient();
  return useQuery<EnrollmentWithRefs[]>({
    queryKey: ["admin", "enrollments"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, student_id, course_id, status, enrolled_at, completed_at, student:profiles(id, full_name, email, department), course:courses(id, title, category)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EnrollmentWithRefs[];
    },
  });
}

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

export function useAdminCreateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { student_id: string; course_id: string }) =>
      apiRequest("/api/admin/enrollments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "enrollments"] }),
  });
}

export function useAdminUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "active" | "completed" | "dropped" }) =>
      apiRequest(`/api/admin/enrollments/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "enrollments"] }),
  });
}

export function useAdminDeleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) =>
      apiRequest(`/api/admin/enrollments/${input.id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "enrollments"] }),
  });
}
