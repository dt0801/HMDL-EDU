import { z } from "zod";

export const COURSE_CATEGORIES = [
  "Tim mạch",
  "Hồi sức cấp cứu",
  "Nội khoa",
  "Ngoại khoa",
  "Sản phụ khoa",
  "Nhi khoa",
  "Chẩn đoán hình ảnh",
  "Kiểm soát nhiễm khuẩn",
  "An toàn người bệnh",
  "Dược lâm sàng",
  "Khác",
] as const;

export const courseSchema = z.object({
  title: z
    .string()
    .min(5, "Tên khóa học tối thiểu 5 ký tự")
    .max(200, "Tên khóa học tối đa 200 ký tự"),
  description: z.string().max(2000, "Mô tả tối đa 2000 ký tự").optional().or(z.literal("")),
  category: z.string().min(1, "Vui lòng chọn chuyên khoa"),
  thumbnail_url: z
    .string()
    .url("URL thumbnail không hợp lệ")
    .optional()
    .or(z.literal("")),
  is_published: z.boolean().default(false),
  requires_enrollment: z.boolean().default(true),
});

export type CourseInput = z.infer<typeof courseSchema>;
