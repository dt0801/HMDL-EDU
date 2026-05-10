"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export type AdminReport = {
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  averageScore: number;
  certificatesIssued: number;
};

export function useAdminReports() {
  const supabase = createClient();

  return useQuery<AdminReport>({
    queryKey: ["admin-reports"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_report_summary");
      if (error) throw error;

      const row = data?.[0];

      return {
        totalStudents: Number(row?.total_students ?? 0),
        totalCourses: Number(row?.total_courses ?? 0),
        publishedCourses: Number(row?.published_courses ?? 0),
        totalEnrollments: Number(row?.total_enrollments ?? 0),
        completedEnrollments: Number(row?.completed_enrollments ?? 0),
        averageScore: Number(row?.average_score ?? 0),
        certificatesIssued: Number(row?.certificates_issued ?? 0),
      };
    },
  });
}

export type TopCourseRow = {
  course_id: string;
  course_title: string;
  enrollments_count: number;
};

export function useTopCourses(limit = 5) {
  const supabase = createClient();

  return useQuery<TopCourseRow[]>({
    queryKey: ["admin-top-courses", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_courses", {
        limit_count: limit,
      });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        course_id: row.course_id,
        course_title: row.course_title,
        enrollments_count: Number(row.enrollments_count ?? 0),
      }));
    },
  });
}
