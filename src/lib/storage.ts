import type { SupabaseClient } from "@supabase/supabase-js";

export const COURSE_CONTENT_BUCKET = "course-content";

/** TTL của signed URL nội dung khóa học (giây) */
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

export function isExternalUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");
}

/**
 * Trả về URL có thể phát/hiển thị được cho `content_url` của lesson.
 * - Nếu là URL http(s)/data/blob → trả về trực tiếp.
 * - Nếu là storage path nội bộ → tạo signed URL trên bucket course-content.
 */
export async function resolveLessonContentUrl(
  supabase: SupabaseClient,
  contentUrl: string | null | undefined
): Promise<string | null> {
  if (!contentUrl) return null;
  if (isExternalUrl(contentUrl)) return contentUrl;

  const { data, error } = await supabase.storage
    .from(COURSE_CONTENT_BUCKET)
    .createSignedUrl(contentUrl, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function buildLessonStoragePath(
  courseId: string,
  fileName: string
): string {
  const ext = (fileName.split(".").pop() ?? "bin").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${courseId}/${id}.${safeExt}`;
}
