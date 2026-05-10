"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { LessonProgress } from "@/types/database.types";

export type CourseProgressSummary = {
  publishedLessons: number;
  completedLessons: number;
  percent: number;
};

export function useCourseProgress(studentId: string | undefined, courseId: string | undefined) {
  const supabase = createClient();
  return useQuery<LessonProgress[]>({
    queryKey: ["lesson-progress", studentId, courseId],
    enabled: !!studentId && !!courseId,
    queryFn: async () => {
      const { data: lessons, error: e1 } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", courseId!);
      if (e1) throw e1;
      const ids = (lessons ?? []).map((l) => l.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("student_id", studentId!)
        .in("lesson_id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCourseProgressSummaries(
  studentId: string | undefined,
  courseIds: string[] | undefined
) {
  const supabase = createClient();
  const normalizedCourseIds = [...new Set(courseIds ?? [])].sort();

  return useQuery<Record<string, CourseProgressSummary>>({
    queryKey: ["course-progress-summaries", studentId, normalizedCourseIds],
    enabled: !!studentId && normalizedCourseIds.length > 0,
    queryFn: async () => {
      const summaries = Object.fromEntries(
        normalizedCourseIds.map((courseId) => [
          courseId,
          { publishedLessons: 0, completedLessons: 0, percent: 0 },
        ])
      ) as Record<string, CourseProgressSummary>;
      const getSummary = (courseId: string) => {
        const summary = summaries[courseId];
        if (!summary) {
          throw new Error(`Missing progress summary for course ${courseId}`);
        }
        return summary;
      };

      const { data: lessonRows, error: lessonError } = await supabase
        .from("lessons")
        .select("id, course_id, is_published")
        .in("course_id", normalizedCourseIds);
      if (lessonError) throw lessonError;

      const publishedLessons = (lessonRows ?? []).filter((lesson) => lesson.is_published);
      const lessonIds = publishedLessons.map((lesson) => lesson.id);
      const lessonToCourse = new Map<string, string>();

      for (const lesson of publishedLessons) {
        lessonToCourse.set(lesson.id, lesson.course_id);
        getSummary(lesson.course_id).publishedLessons += 1;
      }

      if (lessonIds.length > 0) {
        const { data: progressRows, error: progressError } = await supabase
          .from("lesson_progress")
          .select("lesson_id, is_completed")
          .eq("student_id", studentId!)
          .eq("is_completed", true)
          .in("lesson_id", lessonIds);
        if (progressError) throw progressError;

        for (const row of progressRows ?? []) {
          const courseId = lessonToCourse.get(row.lesson_id);
          if (!courseId) continue;
          getSummary(courseId).completedLessons += 1;
        }
      }

      for (const courseId of normalizedCourseIds) {
        const summary = getSummary(courseId);
        summary.percent =
          summary.publishedLessons === 0
            ? 0
            : Math.round((summary.completedLessons / summary.publishedLessons) * 100);
      }

      return summaries;
    },
  });
}

export function useUpsertProgress() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      lesson_id: string;
      watched_seconds: number;
      is_completed: boolean;
    }) => {
      const { error } = await supabase
        .from("lesson_progress")
        .upsert(
          {
            student_id: input.student_id,
            lesson_id: input.lesson_id,
            watched_seconds: input.watched_seconds,
            is_completed: input.is_completed,
            last_watched_at: new Date().toISOString(),
          },
          { onConflict: "student_id,lesson_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-progress"] }),
  });
}
