import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";

const templateSchema = z.object({
  name: z.string().trim().min(2, "Tên mẫu tối thiểu 2 ký tự").max(160),
  courseId: z.string().uuid().nullable().optional(),
  canvasJSON: z.unknown(),
  width: z.coerce.number().int().min(300).max(4000).default(1320),
  height: z.coerce.number().int().min(300).max(4000).default(934),
});

async function requireAdmin() {
  const supabase = createClient();
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
  if (profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "Chỉ admin mới được thao tác." }, { status: 403 }) };
  }

  return { profile };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const service = createServiceClient();
  const { data, error } = await service
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
  const auth = await requireAdmin();
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
  const service = createServiceClient();
  const { data, error } = await service
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
