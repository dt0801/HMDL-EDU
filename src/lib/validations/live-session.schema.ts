import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

export const liveSessionSchema = z.object({
  course_id: z.string().uuid("Khóa học không hợp lệ"),
  lesson_id: z
    .preprocess((value) => (value === null ? undefined : value), z.string().trim().optional())
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || z.string().uuid().safeParse(value).success, {
      message: "Bài học không hợp lệ",
    }),
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(200),
  description: optionalTrimmed,
  scheduled_start_at: z
    .string()
    .min(1, "Chọn thời gian bắt đầu")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Thời gian bắt đầu không hợp lệ"),
  duration_minutes: z.coerce
    .number()
    .int("Thời lượng phải là số nguyên")
    .min(15, "Thời lượng tối thiểu 15 phút")
    .max(480, "Thời lượng tối đa 480 phút"),
  timezone: z.string().trim().default("Asia/Ho_Chi_Minh"),
});

export type LiveSessionInput = z.infer<typeof liveSessionSchema>;
