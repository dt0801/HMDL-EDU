"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { LessonProgress } from "@/types/database.types";

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
