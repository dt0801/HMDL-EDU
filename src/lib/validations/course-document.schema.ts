import { z } from "zod";

export const courseDocumentSchema = z.object({
  course_id: z.string().uuid("Khóa học không hợp lệ"),
  lesson_id: z.string().uuid("Bài học không hợp lệ").optional().nullable(),
  title: z.string().min(3, "Tên tài liệu tối thiểu 3 ký tự").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  file_name: z.string().min(1, "Tên tệp là bắt buộc").max(255),
  file_url: z
    .string()
    .min(1, "Vui lòng tải tệp lên hoặc nhập liên kết")
    .max(2000, "Đường dẫn quá dài")
    .refine(
      (v) => /^https?:\/\//i.test(v) || /^[\w\-./]+\.[a-z0-9]+$/i.test(v),
      "Đường dẫn không hợp lệ"
    ),
  mime_type: z.string().max(255).optional().nullable(),
  file_size_bytes: z
    .number()
    .int()
    .min(0, "Dung lượng tệp không hợp lệ")
    .max(Number.MAX_SAFE_INTEGER)
    .optional()
    .nullable(),
  audience: z.enum(["student", "instructor", "both"], {
    errorMap: () => ({ message: "Phạm vi hiển thị không hợp lệ" }),
  }),
  document_kind: z.enum(["procedure", "template", "slide", "reference", "policy", "other"], {
    errorMap: () => ({ message: "Loại tài liệu không hợp lệ" }),
  }),
  is_published: z.boolean().default(true),
});

export type CourseDocumentInput = z.infer<typeof courseDocumentSchema>;
