import { NextResponse } from "next/server";

import {
  cleanupExpiredLiveSessions,
  requireAuthenticatedProfile,
  requireServiceClient,
} from "@/lib/live-sessions/server";

export const runtime = "nodejs";

async function runCleanupForAuthenticatedUser() {
  const authResult = await requireAuthenticatedProfile(["admin", "instructor"]);
  if ("response" in authResult) return authResult.response;

  const serviceResult = requireServiceClient();
  if ("response" in serviceResult) return serviceResult.response;

  const result = await cleanupExpiredLiveSessions(serviceResult.service, authResult.profile);
  return NextResponse.json(result);
}

export async function POST() {
  try {
    return await runCleanupForAuthenticatedUser();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không dọn được meeting đã hết hạn." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Không có quyền chạy cron cleanup." }, { status: 401 });
  }

  const serviceResult = requireServiceClient();
  if ("response" in serviceResult) return serviceResult.response;

  try {
    const result = await cleanupExpiredLiveSessions(serviceResult.service);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không dọn được meeting đã hết hạn." },
      { status: 500 }
    );
  }
}
