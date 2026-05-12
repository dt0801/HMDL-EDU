import type { SupabaseClient } from "@supabase/supabase-js";

export const COURSE_CONTENT_BUCKET = "course-content";
export const COURSE_DOCUMENTS_BUCKET = "course-documents";

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
  return resolveStorageAssetUrl(supabase, COURSE_CONTENT_BUCKET, contentUrl);
}

export async function resolveDocumentFileUrl(
  supabase: SupabaseClient,
  fileUrl: string | null | undefined
): Promise<string | null> {
  return resolveStorageAssetUrl(supabase, COURSE_DOCUMENTS_BUCKET, fileUrl);
}

async function resolveStorageAssetUrl(
  supabase: SupabaseClient,
  bucket: string,
  assetUrl: string | null | undefined
): Promise<string | null> {
  if (!assetUrl) return null;
  if (isExternalUrl(assetUrl)) return assetUrl;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(assetUrl, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function buildLessonStoragePath(
  courseId: string,
  fileName: string
): string {
  return buildScopedStoragePath(courseId, fileName);
}

export function buildDocumentStoragePath(
  courseId: string,
  fileName: string
): string {
  return buildScopedStoragePath(courseId, fileName);
}

function buildScopedStoragePath(courseId: string, fileName: string): string {
  const ext = (fileName.split(".").pop() ?? "bin").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${courseId}/${id}.${safeExt}`;
}
