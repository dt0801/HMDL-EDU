"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { LiveSessionInput } from "@/lib/validations/live-session.schema";
import type { LiveSession } from "@/types/database.types";

export type LiveSessionWithDetails = LiveSession & {
  course: { id: string; title: string; category: string | null } | null;
  lesson: { id: string; title: string; sort_order: number } | null;
  creator: { id: string; full_name: string } | null;
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

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function buildLiveSessionSelect() {
  return [
    "*",
    "course:courses(id, title, category)",
    "lesson:lessons(id, title, sort_order)",
    "creator:profiles!live_sessions_created_by_fkey(id, full_name)",
  ].join(", ");
}

export function useLiveSessions(
  courseId?: string,
  opts?: { lessonId?: string; includeCanceled?: boolean }
) {
  const supabase = createClient();

  return useQuery<LiveSessionWithDetails[]>({
    queryKey: ["live-sessions", "instructor", courseId, opts],
    queryFn: async () => {
      let query = supabase
        .from("live_sessions")
        .select(buildLiveSessionSelect())
        .order("scheduled_start_at", { ascending: true });

      if (courseId) query = query.eq("course_id", courseId);
      if (opts?.lessonId) query = query.eq("lesson_id", opts.lessonId);
      if (!opts?.includeCanceled) query = query.eq("status", "scheduled");

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as LiveSessionWithDetails[];
    },
  });
}

export function useStudentLiveSessions(
  studentId: string | undefined,
  opts?: { courseId?: string; lessonId?: string }
) {
  const supabase = createClient();

  return useQuery<LiveSessionWithDetails[]>({
    queryKey: ["live-sessions", "student", studentId, opts],
    enabled: !!studentId,
    queryFn: async () => {
      let query = supabase
        .from("live_sessions")
        .select(buildLiveSessionSelect())
        .eq("status", "scheduled")
        .order("scheduled_start_at", { ascending: true });

      if (opts?.courseId) query = query.eq("course_id", opts.courseId);
      if (opts?.lessonId) query = query.eq("lesson_id", opts.lessonId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as LiveSessionWithDetails[];
    },
  });
}

export function useCreateLiveSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: LiveSessionInput) =>
      apiRequest<LiveSession>("/api/live-sessions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
      qc.invalidateQueries({ queryKey: ["course", vars.course_id] });
    },
  });
}

export function useUpdateLiveSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: LiveSessionInput & { id: string }) =>
      apiRequest<LiveSession>(`/api/live-sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
      qc.invalidateQueries({ queryKey: ["course", vars.course_id] });
    },
  });
}

export function useCancelLiveSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      courseId: _courseId,
    }: {
      id: string;
      courseId: string;
    }) =>
      apiRequest<LiveSession>(`/api/live-sessions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
      qc.invalidateQueries({ queryKey: ["course", vars.courseId] });
    },
  });
}

export function useCleanupExpiredLiveSessions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      apiRequest<{ deleted: number }>("/api/live-sessions/cleanup", {
        method: "POST",
      }),
    onSuccess: (result) => {
      if (result.deleted > 0) {
        qc.invalidateQueries({ queryKey: ["live-sessions"] });
      }
    },
  });
}
