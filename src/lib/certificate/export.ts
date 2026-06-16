import type { Json } from "@/types/database.types";

import {
  replaceCertificatePlaceholders,
  type CertificatePlaceholderData,
} from "./placeholders";

type FabricTextLike = {
  type?: string;
  text?: string;
  set: (key: "text" | "fontFamily", value: string) => void;
};

const CERT_FONT = "Noto Sans";

async function waitForCertificateFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  await Promise.all([
    document.fonts.load(`400 24px "${CERT_FONT}"`),
    document.fonts.load(`600 34px "${CERT_FONT}"`),
    document.fonts.load(`700 58px "${CERT_FONT}"`),
  ]);
  await document.fonts.ready;
}

export async function renderCertificateClient(
  templateJSON: Json,
  data: CertificatePlaceholderData,
  options?: { width?: number; height?: number; multiplier?: number }
) {
  if (typeof document === "undefined") {
    throw new Error("Chỉ có thể render chứng chỉ ở trình duyệt.");
  }

  const [fabric, { jsPDF }] = await Promise.all([import("fabric"), import("jspdf")]);
  const canvas = new fabric.Canvas(document.createElement("canvas"), {
    width: options?.width ?? 1320,
    height: options?.height ?? 934,
  });

  await waitForCertificateFonts();

  await canvas.loadFromJSON(templateJSON as Record<string, unknown>);

  canvas.getObjects().forEach((obj: unknown) => {
    const textObject = obj as unknown as FabricTextLike;
    if (!["text", "textbox", "i-text"].includes(textObject.type ?? "")) return;
    textObject.set("text", replaceCertificatePlaceholders(textObject.text ?? "", data));
    textObject.set("fontFamily", CERT_FONT);
  });

  canvas.renderAll();

  const pngDataURL = canvas.toDataURL({
    format: "png",
    multiplier: options?.multiplier ?? 2,
  });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.addImage(pngDataURL, "PNG", 0, 0, 297, 210);
  const pdfBlob = doc.output("blob");

  canvas.dispose();
  return { pngDataURL, pdfBlob };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
