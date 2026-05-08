import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z
    .string()
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .max(72, "Mật khẩu tối đa 72 ký tự"),
});

export type SignInInput = z.infer<typeof signInSchema>;
