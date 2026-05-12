"use client";

import { Download, ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getAudienceLabel,
  getDocumentKindLabel,
  type CourseDocumentWithCourse,
} from "@/hooks/useDocuments";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { isExternalUrl, resolveDocumentFileUrl } from "@/lib/storage";

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatMimeType(value: string | null) {
  if (!value) return null;
  if (value === "application/pdf") return "PDF";
  if (value.includes("word")) return "Word";
  if (value.includes("presentation")) return "PowerPoint";
  if (value.includes("sheet") || value.includes("excel")) return "Excel";
  if (value.startsWith("image/")) return "Hình ảnh";
  return value;
}

export function DocumentsList({
  documents,
  emptyTitle,
  emptyDescription,
  showCourse = true,
  canManage = false,
  onEdit,
  onDelete,
}: {
  documents: CourseDocumentWithCourse[];
  emptyTitle: string;
  emptyDescription?: string;
  showCourse?: boolean;
  canManage?: boolean;
  onEdit?: (document: CourseDocumentWithCourse) => void;
  onDelete?: (document: CourseDocumentWithCourse) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const openDocument = async (document: CourseDocumentWithCourse) => {
    setOpeningId(document.id);
    try {
      const targetUrl = isExternalUrl(document.file_url)
        ? document.file_url
        : await resolveDocumentFileUrl(supabase, document.file_url);

      if (!targetUrl) {
        toast.error("Không mở được tài liệu. Vui lòng thử lại.");
        return;
      }

      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không mở được tài liệu");
    } finally {
      setOpeningId(null);
    }
  };

  if (documents.length === 0) {
    return <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => {
        const fileSize = formatFileSize(document.file_size_bytes);
        const mimeLabel = formatMimeType(document.mime_type);

        return (
          <Card key={document.id}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{document.title}</h3>
                      {showCourse && document.course ? (
                        <Badge variant="secondary">{document.course.title}</Badge>
                      ) : null}
                      {canManage ? (
                        <Badge variant={document.is_published ? "success" : "warning"}>
                          {document.is_published ? "Đã phát hành" : "Bản nháp"}
                        </Badge>
                      ) : null}
                    </div>

                    {document.description ? (
                      <p className="text-sm leading-6 text-muted-foreground">{document.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{document.file_name}</Badge>
                    <Badge variant="outline">{getDocumentKindLabel(document.document_kind)}</Badge>
                    {mimeLabel ? <Badge variant="outline">{mimeLabel}</Badge> : null}
                    {fileSize ? <Badge variant="outline">{fileSize}</Badge> : null}
                    {canManage ? (
                      <Badge variant="outline">{getAudienceLabel(document.audience)}</Badge>
                    ) : null}
                    {document.lesson ? (
                      <Badge variant="outline">
                        Bài {document.lesson.sort_order}: {document.lesson.title}
                      </Badge>
                    ) : null}
                    {document.uploader?.full_name ? (
                      <span className="self-center">Tải lên bởi {document.uploader.full_name}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => openDocument(document)}
                    disabled={openingId === document.id}
                  >
                    {isExternalUrl(document.file_url) ? (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {openingId === document.id ? "Đang mở..." : "Mở tài liệu"}
                  </Button>

                  {canManage ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => onEdit?.(document)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete?.(document)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
