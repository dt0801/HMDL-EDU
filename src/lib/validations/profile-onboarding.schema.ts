import { z } from "zod";

export const profileOnboardingSchema = z.object({
  full_name: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  email: z.string().email("Email không hợp lệ").max(200),
  phone: z
    .string()
    .trim()
    .min(8, "Nhập số điện thoại (tối thiểu 8 ký tự)")
    .max(20),
  department_id: z
    .union([z.string().uuid(), z.literal("")])
    .refine((v) => v !== "", "Chọn phòng ban"),
});

export type ProfileOnboardingInput = z.infer<typeof profileOnboardingSchema>;
