import { z } from "zod";

export const updateUserSchema = z.object({
  full_name: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  role: z.enum(["admin", "instructor", "student"]),
  department: z.string().max(100).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
