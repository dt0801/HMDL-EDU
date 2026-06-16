import { getCloudinaryEnv } from "@/lib/env";

type UploadKind = "pdf" | "png";

let configured = false;

async function getCloudinary() {
  const { v2: cloudinary } = await import("cloudinary");
  const env = getCloudinaryEnv();

  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return { cloudinary, folder: env.CLOUDINARY_FOLDER ?? "hmdl-edu/certificates" };
}

export async function uploadCertificateAsset(input: {
  buffer: Buffer;
  certificateCode: string;
  kind: UploadKind;
}) {
  const { cloudinary, folder } = await getCloudinary();
  const resourceType = input.kind === "pdf" ? "raw" : "image";
  const publicId = `${input.certificateCode}-${input.kind}`.replace(/[^a-zA-Z0-9-_]/g, "-");

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: resourceType,
        format: input.kind,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary không trả về URL."));
          return;
        }
        resolve(result.secure_url);
      }
    );

    stream.end(input.buffer);
  });
}
