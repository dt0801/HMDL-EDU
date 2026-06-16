import { z } from "zod";

const baseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const serviceEnvSchema = baseEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const zoomEnvSchema = z.object({
  ZOOM_ACCOUNT_ID: z.string().min(1),
  ZOOM_CLIENT_ID: z.string().min(1),
  ZOOM_CLIENT_SECRET: z.string().min(1),
  ZOOM_HOST_USER_ID: z.string().min(1),
});

const cloudinaryEnvSchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_FOLDER: z.string().min(1).optional(),
});

const certificateEnvSchema = z.object({
  CERTIFICATE_RENDER_MODE: z.enum(["client", "server"]).default("client"),
  BROWSERLESS_WS_ENDPOINT: z.string().url().optional(),
  BROWSERLESS_URL: z.string().url().optional(),
  BROWSERLESS_TOKEN: z.string().min(1).optional(),
});

function parseEnv<T extends z.ZodTypeAny>(schema: T, label: string): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Thiếu hoặc sai cấu hình ${label}: ${missing}`);
  }
  return parsed.data;
}

export function getBaseEnv() {
  return parseEnv(baseEnvSchema, "ứng dụng");
}

export function getServiceEnv() {
  return parseEnv(serviceEnvSchema, "Supabase service role");
}

export function getZoomEnv() {
  return parseEnv(zoomEnvSchema, "Zoom");
}

export function getCloudinaryEnv() {
  return parseEnv(cloudinaryEnvSchema, "Cloudinary");
}

export function getCertificateEnv() {
  const env = parseEnv(certificateEnvSchema, "certificate render");
  if (env.CERTIFICATE_RENDER_MODE === "server" && !env.BROWSERLESS_WS_ENDPOINT && !env.BROWSERLESS_URL) {
    throw new Error("Thiếu BROWSERLESS_WS_ENDPOINT hoặc BROWSERLESS_URL khi CERTIFICATE_RENDER_MODE=server.");
  }
  return env;
}
