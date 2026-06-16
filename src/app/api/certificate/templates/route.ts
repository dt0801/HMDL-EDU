import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAndService } from "@/lib/auth/server";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";

const templateSchema = z.object({
  name: z.string().trim().min(2, "Tên mẫu tối thiểu 2 ký tự").max(160),
  courseId: z.string().uuid().nullable().optional(),
  canvasJSON: z.unknown(),
  width: z.coerce.number().int().min(300).max(4000).default(1320),
  height: z.coerce.number().int().min(300).max(4000).default(934),
});

export async function GET() {
  const auth = await requireAdminAndService("Chỉ admin mới được thao tác.");
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.service
    .from("certificate_templates")
    .select("*, course:courses(id, title)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdminAndService("Chỉ admin mới được thao tác.");
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const { data, error } = await auth.service
    .from("certificate_templates")
    .insert({
      name: input.name,
      course_id: input.courseId ?? null,
      canvas_json: input.canvasJSON as Json,
      width: input.width,
      height: input.height,
      created_by: auth.profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Không lưu được mẫu chứng chỉ." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
