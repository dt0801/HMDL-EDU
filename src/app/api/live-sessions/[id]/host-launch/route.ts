import { NextResponse } from "next/server";

import {
  assertSessionManagementAccess,
  requireAuthenticatedProfile,
} from "@/lib/live-sessions/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuthenticatedProfile(["admin", "instructor"]);
  if ("response" in authResult) return authResult.response;

  const sessionAccess = await assertSessionManagementAccess(params.id, authResult.profile);
  if ("response" in sessionAccess) return sessionAccess.response;

  const { data: secret, error } = await sessionAccess.service
    .from("live_session_secrets")
    .select("zoom_start_url")
    .eq("session_id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!secret?.zoom_start_url) {
    return NextResponse.json(
      { error: "Không tìm thấy liên kết host cho buổi học này." },
      { status: 404 }
    );
  }

  return NextResponse.redirect(secret.zoom_start_url);
}
