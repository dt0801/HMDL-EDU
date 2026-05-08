"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { LessonInput } from "@/lib/validations/lesson.schema";
import type { Lesson } from "@/types/database.types";

export function useLessons(courseId: string | undefined) {
  const supabase = createClient();
  return useQuery<Lesson[]>({
    queryKey: ["lessons", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateLesson() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: LessonInput & { course_id: string; sort_order: number }
    ) => {
      const { data, error } = await supabase
        .from("lessons")
        .insert({
          course_id: input.course_id,
          title: input.title,
          description: input.description || null,
          type: input.type,
          content_url: input.content_url || null,
          duration_seconds: input.duration_seconds ?? null,
          sort_order: input.sort_order,
          is_published: input.is_published,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["lessons", vars.course_id] }),
  });
}

export function useUpdateLesson() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      course_id: _course_id,
      ...input
    }: LessonInput & { id: string; course_id: string }) => {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: input.title,
          description: input.description || null,
          type: input.type,
          content_url: input.content_url || null,
          duration_seconds: input.duration_seconds ?? null,
          is_published: input.is_published,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["lessons", vars.course_id] }),
  });
}

export function useDeleteLesson() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, course_id: _course_id }: { id: string; course_id: string }) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["lessons", vars.course_id] }),
  });
}

export function useReorderLessons() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId: _courseId,
      orderedIds,
    }: {
      courseId: string;
      orderedIds: string[];
    }) => {
      // Update từng record sort_order theo thứ tự mới.
      // TODO: tối ưu bằng RPC khi danh sách rất lớn.
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from("lessons").update({ sort_order: idx + 1 }).eq("id", id)
        )
      );
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["lessons", vars.courseId] }),
  });
}
