import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

type ProfileRole = "admin" | "instructor" | "student";
type AuthProfile = { id: string; role: ProfileRole };
type AuthFailure = { response: NextResponse };
type AuthSuccess = { profile: AuthProfile };
type ServiceSuccess = { service: ReturnType<typeof createServiceClient> };

export async function requireRole(
  roles: ProfileRole[],
  forbiddenMessage = "Bạn không có quyền thao tác."
): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  if (!profile || !roles.includes(profile.role as ProfileRole)) {
    return { response: NextResponse.json({ error: forbiddenMessage }, { status: 403 }) };
  }

  return { profile: profile as AuthProfile };
}

export function requireServiceClient(): ServiceSuccess | AuthFailure {
  try {
    return { service: createServiceClient() };
  } catch (error) {
    return {
      response: NextResponse.json(
        { error: error instanceof Error ? error.message : "Thiếu cấu hình service role trên server." },
        { status: 500 }
      ),
    };
  }
}

export async function requireAdminAndService(
  forbiddenMessage = "Chỉ admin mới được thao tác."
): Promise<(AuthSuccess & ServiceSuccess) | AuthFailure> {
  const auth = await requireRole(["admin"], forbiddenMessage);
  if ("response" in auth) return auth;

  const service = requireServiceClient();
  if ("response" in service) return service;

  return { profile: auth.profile, service: service.service };
}
