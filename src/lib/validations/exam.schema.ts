import { z } from "zod";

export const examSchema = z.object({
  title: z.string().min(3, "Tên đề thi tối thiểu 3 ký tự").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  duration_minutes: z
    .number()
    .int()
    .min(5, "Thời gian tối thiểu 5 phút")
    .max(480, "Thời gian tối đa 8 giờ"),
  passing_score: z.number().int().min(1).max(100, "Điểm đạt phải từ 1-100%"),
  max_attempts: z.number().int().min(1).max(20),
  is_published: z.boolean().default(false),
  start_at: z.string().optional().nullable(),
  end_at: z.string().optional().nullable(),
});

export type ExamInput = z.infer<typeof examSchema>;

export const answerSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1, "Nội dung đáp án không được trống"),
  is_correct: z.boolean(),
});

export const questionSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(3, "Nội dung câu hỏi tối thiểu 3 ký tự"),
  type: z.enum(["mcq", "multi", "true_false"]),
  points: z.number().int().min(1).max(100),
  explanation: z.string().max(1000).optional().or(z.literal("")),
  answers: z
    .array(answerSchema)
    .min(2, "Câu hỏi cần ít nhất 2 đáp án")
    .max(8, "Tối đa 8 đáp án")
    .refine((arr) => arr.some((a) => a.is_correct), {
      message: "Phải có ít nhất 1 đáp án đúng",
    }),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
