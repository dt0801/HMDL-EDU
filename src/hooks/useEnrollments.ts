"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Enrollment } from "@/types/database.types";

export type EnrollmentWithCourse = Enrollment & {
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    category: string | null;
  } | null;
};

export type EnrollmentWithStudent = Enrollment & {
  student: { id: string; full_name: string; email: string; department: string | null } | null;
};

export function useMyEnrollments(studentId: string | undefined) {
  const supabase = createClient();
  return useQuery<EnrollmentWithCourse[]>({
    queryKey: ["my-enrollments", studentId],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(
          "id, student_id, course_id, enrolled_at, completed_at, status, course:courses(id, title, thumbnail_url, category)"
        )
        .eq("student_id", studentId!)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EnrollmentWithCourse[];
    },
  });
}

export function useCourseEnrollments(courseId: string | undefined) {
  const supabase = createClient();
  return useQuery<EnrollmentWithStudent[]>({
    queryKey: ["course-enrollments", courseId],
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(
          "id, student_id, course_id, enrolled_at, completed_at, status, student:profiles!enrollments_student_id_fkey(id, full_name, email, department)"
        )
        .eq("course_id", courseId!)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EnrollmentWithStudent[];
    },
  });
}

export function useEnroll() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, courseId }: { studentId: string; courseId: string }) => {
      const { error } = await supabase
        .from("enrollments")
        .insert({ student_id: studentId, course_id: courseId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      qc.invalidateQueries({ queryKey: ["course-enrollments"] });
    },
  });
}
