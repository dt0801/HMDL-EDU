import { NextResponse } from "next/server";

import {
  assertCourseManagementAccess,
  cleanupExpiredLiveSessions,
  normalizeSessionTime,
  requireAuthenticatedProfile,
} from "@/lib/live-sessions/server";
import { createZoomMeeting, deleteZoomMeeting } from "@/lib/zoom/server";
import { liveSessionSchema } from "@/lib/validations/live-session.schema";

export const runtime = "nodejs";

const MAX_DURATION_MINUTES = 480;

function toMs(value: string) {
  return new Date(value).getTime();
}

function formatConflictMessage(conflicts: Array<{ title: string; scheduled_start_at: string }>) {
  const parts = conflicts.slice(0, 3).map((c) => `${c.title} (${c.scheduled_start_at})`);
  const suffix = conflicts.length > 3 ? ` (+${conflicts.length - 3})` : "";
  return `Trùng giờ với buổi khác: ${parts.join(", ")}${suffix}. Vui lòng chọn khung giờ khác.`;
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedProfile(["admin", "instructor"]);
  if ("response" in authResult) return authResult.response;

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
  const accessResult = await assertCourseManagementAccess(input.course_id, authResult.profile);
  if ("response" in accessResult) return accessResult.response;

  const { service } = accessResult;
  await cleanupExpiredLiveSessions(service, authResult.profile).catch(() => undefined);

  // Guard: prevent overlapping sessions (single shared host across system).
  try {
    const startIso = normalizeSessionTime(input.scheduled_start_at);
    const startMs = toMs(startIso);
    const endMs = startMs + input.duration_minutes * 60_000;
    const windowStart = new Date(startMs - MAX_DURATION_MINUTES * 60_000).toISOString();
    const windowEnd = new Date(endMs).toISOString();

    const { data: candidates, error: candidateErr } = await service
      .from("live_sessions")
      .select("id, title, scheduled_start_at, duration_minutes, status")
      .eq("status", "scheduled")
      .gte("scheduled_start_at", windowStart)
      .lte("scheduled_start_at", windowEnd);

    if (candidateErr) throw candidateErr;

    const conflicts = (candidates ?? [])
      .map((row) => {
        const rowStartMs = toMs(row.scheduled_start_at);
        const rowEndMs = rowStartMs + (row.duration_minutes ?? 0) * 60_000;
        const overlaps = rowStartMs < endMs && rowEndMs > startMs;
        return overlaps ? { title: row.title, scheduled_start_at: row.scheduled_start_at } : null;
      })
      .filter(Boolean) as Array<{ title: string; scheduled_start_at: string }>;

    if (conflicts.length > 0) {
      return NextResponse.json({ error: formatConflictMessage(conflicts) }, { status: 409 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không kiểm tra được trùng lịch." },
      { status: 500 }
    );
  }

  let zoomMeetingId: string | null = null;
  try {
    const zoomMeeting = await createZoomMeeting({
      topic: input.title,
      agenda: input.description ?? undefined,
      start_time: normalizeSessionTime(input.scheduled_start_at),
      duration: input.duration_minutes,
      timezone: input.timezone,
    });

    zoomMeetingId = String(zoomMeeting.id);

    const { data: session, error: sessionError } = await service
      .from("live_sessions")
      .insert({
        course_id: input.course_id,
        lesson_id: input.lesson_id,
        title: input.title,
        description: input.description,
        scheduled_start_at: normalizeSessionTime(input.scheduled_start_at),
        duration_minutes: input.duration_minutes,
        timezone: input.timezone,
        zoom_meeting_id: zoomMeetingId,
        zoom_join_url: zoomMeeting.join_url,
        created_by: authResult.profile.id,
      })
      .select("*")
      .single();

    if (sessionError || !session) {
      throw new Error(sessionError?.message ?? "Không lưu được buổi học trực tuyến.");
    }

    const startUrl = zoomMeeting.start_url;
    if (!startUrl) {
      await service.from("live_sessions").delete().eq("id", session.id);
      throw new Error("Zoom không trả về start_url cho host.");
    }

    const { error: secretError } = await service.from("live_session_secrets").insert({
      session_id: session.id,
      zoom_start_url: startUrl,
    });

    if (secretError) {
      await service.from("live_sessions").delete().eq("id", session.id);
      throw new Error(secretError.message);
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (zoomMeetingId) {
      await deleteZoomMeeting(zoomMeetingId).catch(() => undefined);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được meeting Zoom." },
      { status: 500 }
    );
  }
}
