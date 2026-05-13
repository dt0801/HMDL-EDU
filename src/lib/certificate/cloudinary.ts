type UploadKind = "pdf" | "png";

let configured = false;

function assertCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Thiếu cấu hình Cloudinary. Cần CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET."
    );
  }

  return { cloudName, apiKey, apiSecret };
}

async function getCloudinary() {
  const { v2: cloudinary } = await import("cloudinary");
  const env = assertCloudinaryEnv();

  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudName,
      api_key: env.apiKey,
      api_secret: env.apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

export async function uploadCertificateAsset(input: {
  buffer: Buffer;
  certificateCode: string;
  kind: UploadKind;
}) {
  const cloudinary = await getCloudinary();
  const folder = process.env.CLOUDINARY_FOLDER || "hmdl-edu/certificates";
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

