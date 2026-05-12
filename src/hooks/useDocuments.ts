"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { COURSE_DOCUMENTS_BUCKET, isExternalUrl } from "@/lib/storage";
import type { CourseDocumentInput } from "@/lib/validations/course-document.schema";
import type {
  CourseDocument,
  CourseDocumentAudience,
  CourseDocumentKind,
} from "@/types/database.types";

export type CourseDocumentWithCourse = CourseDocument & {
  course: { id: string; title: string; category: string | null } | null;
  lesson: { id: string; title: string; sort_order: number } | null;
  uploader: { id: string; full_name: string } | null;
};

export function useCourseDocuments(
  courseId: string | undefined,
  opts?: {
    audience?: "student" | "instructor";
    publishedOnly?: boolean;
    lessonId?: string | null;
    kind?: CourseDocumentKind;
  }
) {
  const supabase = createClient();
  return useQuery<CourseDocumentWithCourse[]>({
    queryKey: ["course-documents", courseId, opts],
    enabled: !!courseId,
    queryFn: async () => {
      let query = supabase
        .from("course_documents")
        .select(
          "*, course:courses(id, title, category), lesson:lessons(id, title, sort_order), uploader:profiles!course_documents_uploaded_by_fkey(id, full_name)"
        )
        .eq("course_id", courseId!)
        .order("created_at", { ascending: false });

      if (opts?.publishedOnly) query = query.eq("is_published", true);
      if (opts?.audience === "student") {
        query = query.in("audience", ["student", "both"]);
      }
      if (opts?.audience === "instructor") {
        query = query.in("audience", ["instructor", "both"]);
      }
      if (opts?.lessonId !== undefined) {
        if (opts.lessonId === null) {
          query = query.is("lesson_id", null);
        } else {
          query = query.eq("lesson_id", opts.lessonId);
        }
      }
      if (opts?.kind) {
        query = query.eq("document_kind", opts.kind);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CourseDocumentWithCourse[];
    },
  });
}

export function useInstructorDocuments(courseId?: string) {
  const supabase = createClient();
  return useQuery<CourseDocumentWithCourse[]>({
    queryKey: ["documents", "instructor", courseId],
    queryFn: async () => {
      let query = supabase
        .from("course_documents")
        .select(
          "*, course:courses(id, title, category), lesson:lessons(id, title, sort_order), uploader:profiles!course_documents_uploaded_by_fkey(id, full_name)"
        )
        .order("created_at", { ascending: false });

      if (courseId) query = query.eq("course_id", courseId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CourseDocumentWithCourse[];
    },
  });
}

export function useStudentDocuments(studentId: string | undefined) {
  const supabase = createClient();
  return useQuery<CourseDocumentWithCourse[]>({
    queryKey: ["documents", "student", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_documents")
        .select(
          "*, course:courses(id, title, category), lesson:lessons(id, title, sort_order), uploader:profiles!course_documents_uploaded_by_fkey(id, full_name)"
        )
        .eq("is_published", true)
        .in("audience", ["student", "both"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CourseDocumentWithCourse[];
    },
  });
}

export function useCreateDocument() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CourseDocumentInput & { uploaded_by: string }) => {
      const { data, error } = await supabase
        .from("course_documents")
        .insert({
          course_id: input.course_id,
          lesson_id: input.lesson_id ?? null,
          title: input.title,
          description: input.description || null,
          file_url: input.file_url,
          file_name: input.file_name,
          mime_type: input.mime_type || null,
          file_size_bytes: input.file_size_bytes ?? null,
          audience: input.audience,
          document_kind: input.document_kind,
          is_published: input.is_published,
          uploaded_by: input.uploaded_by,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["course-documents", vars.course_id] });
    },
  });
}

export function useUpdateDocument() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CourseDocumentInput & { id: string }) => {
      const { error } = await supabase
        .from("course_documents")
        .update({
          lesson_id: input.lesson_id ?? null,
          title: input.title,
          description: input.description || null,
          file_url: input.file_url,
          file_name: input.file_name,
          mime_type: input.mime_type || null,
          file_size_bytes: input.file_size_bytes ?? null,
          audience: input.audience,
          document_kind: input.document_kind,
          is_published: input.is_published,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["course-documents", vars.course_id] });
    },
  });
}

export function useDeleteDocument() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      courseId: _courseId,
      fileUrl,
    }: {
      id: string;
      courseId: string;
      fileUrl: string;
    }) => {
      const { error } = await supabase.from("course_documents").delete().eq("id", id);
      if (error) throw error;

      if (!isExternalUrl(fileUrl)) {
        await supabase.storage.from(COURSE_DOCUMENTS_BUCKET).remove([fileUrl]).catch(() => undefined);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["course-documents", vars.courseId] });
    },
  });
}

export function getAudienceLabel(audience: CourseDocumentAudience) {
  switch (audience) {
    case "student":
      return "Học viên";
    case "instructor":
      return "Giảng viên";
    default:
      return "Cả hai";
  }
}

export function getDocumentKindLabel(kind: CourseDocumentKind) {
  switch (kind) {
    case "procedure":
      return "Quy trình";
    case "template":
      return "Biểu mẫu";
    case "slide":
      return "Slide";
    case "policy":
      return "Chính sách";
    case "other":
      return "Khác";
    default:
      return "Tham khảo";
  }
}
