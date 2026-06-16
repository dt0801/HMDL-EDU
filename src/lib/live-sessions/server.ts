import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ZoomApiError, deleteZoomMeeting } from "@/lib/zoom/server";
import type { LiveSession, Profile, UserRole } from "@/types/database.types";

type RequestProfile = Pick<Profile, "id" | "role" | "full_name">;
type ServiceClient = ReturnType<typeof createServiceClient>;
type CourseRecord = { id: string; title: string; instructor_id: string | null };
type CleanupCandidate = LiveSession & {
  course: { instructor_id: string | null } | null;
};

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
  const supabase = await createClient();
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

export function getLiveSessionEndMs(session: Pick<LiveSession, "scheduled_start_at" | "duration_minutes">) {
  return new Date(session.scheduled_start_at).getTime() + session.duration_minutes * 60_000;
}

export async function cleanupExpiredLiveSessions(
  service: ServiceClient,
  profile?: Pick<RequestProfile, "id" | "role">
) {
  const now = Date.now();
  const { data, error } = await service
    .from("live_sessions")
    .select("*, course:courses(instructor_id)")
    .eq("status", "scheduled")
    .lte("scheduled_start_at", new Date(now).toISOString());

  if (error) throw error;

  const expired = ((data ?? []) as unknown as CleanupCandidate[]).filter((session) => {
    if (getLiveSessionEndMs(session) > now) return false;
    if (!profile || profile.role === "admin") return true;
    return session.course?.instructor_id === profile.id;
  });

  for (const session of expired) {
    try {
      await deleteZoomMeeting(session.zoom_meeting_id);
    } catch (error) {
      if (!(error instanceof ZoomApiError) || error.status !== 404) {
        throw error;
      }
    }

    await service.from("live_sessions").delete().eq("id", session.id).throwOnError();
  }

  return { deleted: expired.length };
}
