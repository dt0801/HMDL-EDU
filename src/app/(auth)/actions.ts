"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signInSchema, type SignInInput } from "@/lib/validations/auth.schema";

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signInAction(input: SignInInput): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "Email hoặc mật khẩu không đúng" };
  }

  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
