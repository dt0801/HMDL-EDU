import { z } from "zod";

export const lessonSchema = z.object({
  title: z.string().min(3, "Tên bài học tối thiểu 3 ký tự").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  type: z.enum(["video", "document", "text"], {
    errorMap: () => ({ message: "Loại bài học không hợp lệ" }),
  }),
  content_url: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  duration_seconds: z
    .number()
    .int()
    .min(0, "Thời lượng phải >= 0")
    .max(60 * 60 * 12, "Thời lượng quá dài")
    .optional()
    .nullable(),
  is_published: z.boolean().default(true),
});

export type LessonInput = z.infer<typeof lessonSchema>;
