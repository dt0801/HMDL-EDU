"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { ExamInput, QuestionInput } from "@/lib/validations/exam.schema";
import type { Answer, Exam, ExamAttempt, Question } from "@/types/database.types";

export type ExamWithCourse = Exam & {
  course: { id: string; title: string } | null;
  questions_count?: number;
};

export type StudentExamListItem = Exam & {
  course: { id: string; title: string; category: string | null } | null;
  questions: { count: number }[] | null;
};

export type QuestionWithAnswers = Question & { answers: Answer[] };

const EXAM_SELECT =
  "id, course_id, title, description, duration_minutes, passing_score, max_attempts, is_published, start_at, end_at, created_at";

export function useExamsByCourse(courseId: string | undefined) {
  const supabase = createClient();
  return useQuery<Exam[]>({
    queryKey: ["exams", "by-course", courseId],
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(EXAM_SELECT)
        .eq("course_id", courseId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllExams() {
  const supabase = createClient();
  return useQuery<ExamWithCourse[]>({
    queryKey: ["exams"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(`${EXAM_SELECT}, course:courses(id, title)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExamWithCourse[];
    },
  });
}

export function useStudentExams(studentId: string | undefined) {
  const supabase = createClient();
  return useQuery<StudentExamListItem[]>({
    queryKey: ["student-exams", studentId],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(`${EXAM_SELECT}, course:courses(id, title, category), questions(count)`)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StudentExamListItem[];
    },
  });
}

export function useExam(id: string | undefined) {
  const supabase = createClient();
  return useQuery<ExamWithCourse | null>({
    queryKey: ["exam", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(`${EXAM_SELECT}, course:courses(id, title)`)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ExamWithCourse | null;
    },
  });
}

export function useExamQuestions(examId: string | undefined) {
  const supabase = createClient();
  return useQuery<QuestionWithAnswers[]>({
    queryKey: ["exam-questions", examId],
    enabled: !!examId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, exam_id, content, type, points, sort_order, explanation, answers(id, question_id, content, is_correct, sort_order)")
        .eq("exam_id", examId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as QuestionWithAnswers[];
      return rows.map((q) => ({
        ...q,
        answers: [...(q.answers ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
  });
}

export function useCreateExam() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExamInput & { course_id: string }) => {
      const { data, error } = await supabase
        .from("exams")
        .insert({
          course_id: input.course_id,
          title: input.title,
          description: input.description || null,
          duration_minutes: input.duration_minutes,
          passing_score: input.passing_score,
          max_attempts: input.max_attempts,
          is_published: input.is_published,
          start_at: input.start_at || null,
          end_at: input.end_at || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
  });
}

export function useUpdateExam() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ExamInput & { id: string }) => {
      const { error } = await supabase
        .from("exams")
        .update({
          title: input.title,
          description: input.description || null,
          duration_minutes: input.duration_minutes,
          passing_score: input.passing_score,
          max_attempts: input.max_attempts,
          is_published: input.is_published,
          start_at: input.start_at || null,
          end_at: input.end_at || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["exam", vars.id] });
    },
  });
}

export function useSaveQuestion() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      examId,
      question,
      sortOrder,
    }: {
      examId: string;
      question: QuestionInput;
      sortOrder: number;
    }) => {
      let questionId = question.id;

      if (questionId) {
        const { error } = await supabase
          .from("questions")
          .update({
            content: question.content,
            type: question.type,
            points: question.points,
            sort_order: sortOrder,
            explanation: question.explanation || null,
          })
          .eq("id", questionId);
        if (error) throw error;
        await supabase.from("answers").delete().eq("question_id", questionId);
      } else {
        const { data, error } = await supabase
          .from("questions")
          .insert({
            exam_id: examId,
            content: question.content,
            type: question.type,
            points: question.points,
            sort_order: sortOrder,
            explanation: question.explanation || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        questionId = data.id;
      }

      const { error: ansError } = await supabase.from("answers").insert(
        question.answers.map((a, idx) => ({
          question_id: questionId!,
          content: a.content,
          is_correct: a.is_correct,
          sort_order: idx + 1,
        }))
      );
      if (ansError) throw ansError;
      return { questionId };
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["exam-questions", vars.examId] }),
  });
}

export function useDeleteQuestion() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, examId: _examId }: { id: string; examId: string }) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["exam-questions", vars.examId] }),
  });
}

export function useStudentAttempts(studentId: string | undefined, examId?: string) {
  const supabase = createClient();
  return useQuery<ExamAttempt[]>({
    queryKey: ["exam-attempts", studentId, examId],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("exam_attempts")
        .select("id, student_id, exam_id, score, is_passed, started_at, submitted_at, answers_snapshot")
        .eq("student_id", studentId!)
        .order("started_at", { ascending: false });
      if (examId) q = q.eq("exam_id", examId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
