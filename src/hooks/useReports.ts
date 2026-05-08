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
    queryFn: async () => {
      const [
        { count: totalStudents },
        { count: totalCourses },
        { count: publishedCourses },
        { count: totalEnrollments },
        { count: completedEnrollments },
        { count: certificatesIssued },
        { data: scoreRows },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true),
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase.from("certificates").select("*", { count: "exact", head: true }),
        supabase.from("exam_attempts").select("score").not("score", "is", null),
      ]);

      const scores = (scoreRows ?? [])
        .map((r) => Number(r.score))
        .filter((n) => Number.isFinite(n));
      const averageScore =
        scores.length === 0 ? 0 : Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10;

      return {
        totalStudents: totalStudents ?? 0,
        totalCourses: totalCourses ?? 0,
        publishedCourses: publishedCourses ?? 0,
        totalEnrollments: totalEnrollments ?? 0,
        completedEnrollments: completedEnrollments ?? 0,
        averageScore,
        certificatesIssued: certificatesIssued ?? 0,
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
    queryFn: async () => {
      // Lấy danh sách enrollments + course title rồi group ở client (đủ dùng cho 300 user nội bộ)
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, course:courses(id, title)");
      if (error) throw error;
      type Row = { course_id: string; course: { id: string; title: string } | null };
      const rows = (data ?? []) as unknown as Row[];
      const map = new Map<string, TopCourseRow>();
      for (const row of rows) {
        const key = row.course_id;
        const existing = map.get(key);
        if (existing) {
          existing.enrollments_count += 1;
        } else {
          map.set(key, {
            course_id: key,
            course_title: row.course?.title ?? "(Đã xóa)",
            enrollments_count: 1,
          });
        }
      }
      return Array.from(map.values())
        .sort((a, b) => b.enrollments_count - a.enrollments_count)
        .slice(0, limit);
    },
  });
}
