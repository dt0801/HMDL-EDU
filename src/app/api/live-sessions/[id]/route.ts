import { NextResponse } from "next/server";

import {
  assertCourseManagementAccess,
  assertSessionManagementAccess,
  normalizeSessionTime,
  requireAuthenticatedProfile,
} from "@/lib/live-sessions/server";
import {
  ZoomApiError,
  deleteZoomMeeting,
  updateZoomMeeting,
} from "@/lib/zoom/server";
import { liveSessionSchema } from "@/lib/validations/live-session.schema";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuthenticatedProfile(["admin", "instructor"]);
  if ("response" in authResult) return authResult.response;

  const sessionAccess = await assertSessionManagementAccess(params.id, authResult.profile);
  if ("response" in sessionAccess) return sessionAccess.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const parsed = liveSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const courseAccess = await assertCourseManagementAccess(input.course_id, authResult.profile);
  if ("response" in courseAccess) return courseAccess.response;

  try {
    await updateZoomMeeting(sessionAccess.session.zoom_meeting_id, {
      topic: input.title,
      agenda: input.description ?? undefined,
      start_time: normalizeSessionTime(input.scheduled_start_at),
      duration: input.duration_minutes,
      timezone: input.timezone,
    });

    const { data, error } = await sessionAccess.service
      .from("live_sessions")
      .update({
        course_id: input.course_id,
        lesson_id: input.lesson_id,
        title: input.title,
        description: input.description,
        scheduled_start_at: normalizeSessionTime(input.scheduled_start_at),
        duration_minutes: input.duration_minutes,
        timezone: input.timezone,
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Không cập nhật được buổi học.");
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không cập nhật được meeting Zoom." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuthenticatedProfile(["admin", "instructor"]);
  if ("response" in authResult) return authResult.response;

  const sessionAccess = await assertSessionManagementAccess(params.id, authResult.profile);
  if ("response" in sessionAccess) return sessionAccess.response;

  try {
    await deleteZoomMeeting(sessionAccess.session.zoom_meeting_id);
  } catch (error) {
    if (!(error instanceof ZoomApiError) || error.status !== 404) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Không hủy được meeting Zoom." },
        { status: 500 }
      );
    }
  }

  const { data, error } = await sessionAccess.service
    .from("live_sessions")
    .update({ status: "canceled" })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Không cập nhật được trạng thái buổi học." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
