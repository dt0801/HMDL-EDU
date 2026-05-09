import { z } from "zod";

const uuidOrEmpty = z.union([z.string().uuid(), z.literal("")]);

export const updateUserSchema = z.object({
  full_name: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  role: z.enum(["admin", "instructor", "student"]),
  department_id: uuidOrEmpty.optional().transform((v) => (v === "" || v === undefined ? null : v)),
  /** Text mirror `profiles.department` — đồng bộ khi gán phòng ban */
  department: z.string().max(100).nullable().optional(),
  is_active: z.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
