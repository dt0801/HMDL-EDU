import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { LiveSession, Profile, UserRole } from "@/types/database.types";

type RequestProfile = Pick<Profile, "id" | "role" | "full_name">;
type ServiceClient = ReturnType<typeof createServiceClient>;
type CourseRecord = { id: string; title: string; instructor_id: string | null };

type AuthProfileResult =
  | { profile: RequestProfile }
  | { response: NextResponse<{ error: string }> };

type ServiceClientResult =
  | { service: ServiceClient }
  | { response: NextResponse<{ error: string }> };

type CourseAccessResult =
  | { service: ServiceClient; course: CourseRecord }
  | { response: NextResponse<{ error: string }> };

type SessionAccessResult =
  | { service: ServiceClient; session: LiveSession }
  | { response: NextResponse<{ error: string }> };

export async function requireAuthenticatedProfile(
  allowedRoles?: UserRole[]
): Promise<AuthProfileResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }),
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!data) {
    return {
      response: NextResponse.json({ error: "Không tìm thấy hồ sơ người dùng." }, { status: 404 }),
    };
  }

  const profile = data as RequestProfile;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return {
      response: NextResponse.json({ error: "Bạn không có quyền thao tác." }, { status: 403 }),
    };
  }

  return { profile };
}

export function requireServiceClient(): ServiceClientResult {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      response: NextResponse.json(
        { error: "Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY trên server." },
        { status: 500 }
      ),
    };
  }

  return { service: createServiceClient() };
}

export async function assertCourseManagementAccess(
  courseId: string,
  profile: RequestProfile
): Promise<CourseAccessResult> {
  const serviceResult = requireServiceClient();
  if ("response" in serviceResult) return serviceResult;

  const { service } = serviceResult;
  const { data, error } = await service
    .from("courses")
    .select("id, title, instructor_id")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    return {
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!data) {
    return {
      response: NextResponse.json({ error: "Không tìm thấy khóa học." }, { status: 404 }),
    };
  }

  const course = data as CourseRecord;

  if (profile.role !== "admin" && course.instructor_id !== profile.id) {
    return {
      response: NextResponse.json({ error: "Bạn không quản lý khóa học này." }, { status: 403 }),
    };
  }

  return { service, course };
}

export async function assertSessionManagementAccess(
  sessionId: string,
  profile: RequestProfile
): Promise<SessionAccessResult> {
  const serviceResult = requireServiceClient();
  if ("response" in serviceResult) return serviceResult;

  const { service } = serviceResult;
  const { data, error } = await service
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return {
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!data) {
    return {
      response: NextResponse.json({ error: "Không tìm thấy buổi học trực tuyến." }, { status: 404 }),
    };
  }

  const session = data as LiveSession;

  if (profile.role !== "admin") {
    const courseAccess = await assertCourseManagementAccess(session.course_id, profile);
    if ("response" in courseAccess) return courseAccess;
  }

  return { service, session };
}

export function normalizeSessionTime(value: string) {
  return new Date(value).toISOString();
}
