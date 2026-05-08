"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { CourseInput } from "@/lib/validations/course.schema";
import type { Course } from "@/types/database.types";

export type CourseWithInstructor = Course & {
  instructor: { id: string; full_name: string } | null;
  enrollments_count?: number;
  lessons_count?: number;
};

export function useCourses(opts?: { onlyMine?: boolean; instructorId?: string }) {
  const supabase = createClient();
  return useQuery<CourseWithInstructor[]>({
    queryKey: ["courses", opts],
    queryFn: async () => {
      let q = supabase
        .from("courses")
        .select(
          "*, instructor:profiles!courses_instructor_id_fkey(id, full_name), enrollments(count), lessons(count)"
        )
        .order("created_at", { ascending: false });
      if (opts?.instructorId) q = q.eq("instructor_id", opts.instructorId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<
        CourseWithInstructor & { enrollments?: { count: number }[]; lessons?: { count: number }[] }
      >;
      return rows.map((r) => ({
        ...r,
        enrollments_count: r.enrollments?.[0]?.count ?? 0,
        lessons_count: r.lessons?.[0]?.count ?? 0,
      }));
    },
  });
}

export function useCourse(id: string | undefined) {
  const supabase = createClient();
  return useQuery<CourseWithInstructor | null>({
    queryKey: ["course", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, instructor:profiles!courses_instructor_id_fkey(id, full_name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CourseWithInstructor | null;
    },
  });
}

export function useCreateCourse() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CourseInput & { instructor_id: string }) => {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: input.title,
          description: input.description || null,
          category: input.category || null,
          thumbnail_url: input.thumbnail_url || null,
          is_published: input.is_published,
          requires_enrollment: input.requires_enrollment,
          instructor_id: input.instructor_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useUpdateCourse() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CourseInput & { id: string }) => {
      const { data, error } = await supabase
        .from("courses")
        .update({
          title: input.title,
          description: input.description || null,
          category: input.category || null,
          thumbnail_url: input.thumbnail_url || null,
          is_published: input.is_published,
          requires_enrollment: input.requires_enrollment,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["course", vars.id] });
    },
  });
}

export function useDeleteCourse() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useToggleCoursePublish() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}
