"use client";

import { Download, ImageDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  downloadBlob,
  downloadDataUrl,
  renderCertificateClient,
} from "@/lib/certificate/export";
import type { CertificatePlaceholderData } from "@/lib/certificate/placeholders";
import type { Json } from "@/types/database.types";

export function CertificateDownloadActions({
  certificateId,
  templateJSON,
  width,
  height,
  data,
}: {
  certificateId: string;
  templateJSON?: Json | null;
  width?: number | null;
  height?: number | null;
  data: CertificatePlaceholderData;
}) {
  const [loading, setLoading] = useState<"pdf" | "png" | null>(null);
  const hasTemplate = Boolean(templateJSON);

  const downloadPdf = async () => {
    if (!templateJSON) {
      window.open(`/api/certificates/${certificateId}`, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading("pdf");
    try {
      const { pdfBlob } = await renderCertificateClient(templateJSON, data, {
        width: width ?? 1320,
        height: height ?? 934,
        multiplier: 2,
      });
      downloadBlob(pdfBlob, `${data.certificateCode}.pdf`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được PDF.");
    } finally {
      setLoading(null);
    }
  };

  const downloadPng = async () => {
    if (!templateJSON) {
      toast.error("Chứng chỉ này chưa gắn template PNG.");
      return;
    }

    setLoading("png");
    try {
      const { pngDataURL } = await renderCertificateClient(templateJSON, data, {
        width: width ?? 1320,
        height: height ?? 934,
        multiplier: 2,
      });
      downloadDataUrl(pngDataURL, `${data.certificateCode}.png`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được PNG.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="button" size="sm" onClick={downloadPdf} disabled={loading !== null}>
        {loading === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        PDF
      </Button>
      {hasTemplate ? (
        <Button type="button" size="sm" variant="outline" onClick={downloadPng} disabled={loading !== null}>
          {loading === "png" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImageDown className="mr-2 h-4 w-4" />
          )}
          PNG
        </Button>
      ) : null}
    </div>
  );
}

