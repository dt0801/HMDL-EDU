"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Certificate, CertificateTemplate } from "@/types/database.types";

export type CertificateTemplateLite = Pick<
  CertificateTemplate,
  "id" | "name" | "canvas_json" | "width" | "height"
>;

export type CertificateWithCourse = Certificate & {
  course: { id: string; title: string; category: string | null } | null;
  template: CertificateTemplateLite | null;
};

export type CertificateWithCourseAndStudent = Certificate & {
  course: { id: string; title: string; category: string | null } | null;
  student: { id: string; full_name: string; email: string } | null;
  template: CertificateTemplateLite | null;
};

export function useMyCertificates(studentId: string | undefined) {
  const supabase = createClient();
  return useQuery<CertificateWithCourse[]>({
    queryKey: ["my-certificates", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, course:courses(id, title, category), template:certificate_templates(id, name, canvas_json, width, height)")
        .eq("student_id", studentId!)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CertificateWithCourse[];
    },
  });
}

export function useCourseCertificate(studentId: string | undefined, courseId: string | undefined) {
  const supabase = createClient();
  return useQuery<CertificateWithCourse | null>({
    queryKey: ["my-certificate", studentId, courseId],
    enabled: !!studentId && !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, course:courses(id, title, category), template:certificate_templates(id, name, canvas_json, width, height)")
        .eq("student_id", studentId!)
        .eq("course_id", courseId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as CertificateWithCourse | null;
    },
  });
}

export function useInstructorCertificates(instructorId: string | undefined) {
  const supabase = createClient();
  return useQuery<CertificateWithCourseAndStudent[]>({
    queryKey: ["instructor-certificates", instructorId],
    enabled: !!instructorId,
    queryFn: async () => {
      // RLS allows instructors to see certificates for their courses.
      const { data, error } = await supabase
        .from("certificates")
        .select("*, course:courses(id, title, category), student:profiles!certificates_student_id_fkey(id, full_name, email), template:certificate_templates(id, name, canvas_json, width, height)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CertificateWithCourseAndStudent[];
    },
  });
}
