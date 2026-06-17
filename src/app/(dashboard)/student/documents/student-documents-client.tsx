"use client";

import { useMemo, useState } from "react";

import { DocumentsList } from "@/components/documents/documents-list";
import { useDashboardProfile } from "@/components/providers/dashboard-profile-provider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDocumentKindLabel,
  useStudentDocuments,
} from "@/hooks/useDocuments";
import type { CourseDocumentKind } from "@/types/database.types";

const ALL_KINDS = "__all__";

const DOCUMENT_KIND_OPTIONS: CourseDocumentKind[] = [
  "procedure",
  "template",
  "slide",
  "reference",
  "policy",
  "other",
];

export function StudentDocumentsClient() {
  const profile = useDashboardProfile();
  const { data: documents = [], isLoading: documentsLoading } = useStudentDocuments(profile.id);
  const [selectedKind, setSelectedKind] = useState<string>(ALL_KINDS);

  const filteredDocuments = useMemo(() => {
    if (selectedKind === ALL_KINDS) return documents;
    return documents.filter((document) => document.document_kind === selectedKind);
  }, [documents, selectedKind]);

  if (documentsLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Đang tải danh sách tài liệu...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-medium">Lọc theo loại tài liệu</p>
            <Select value={selectedKind} onValueChange={setSelectedKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_KINDS}>Tất cả loại</SelectItem>
                {DOCUMENT_KIND_OPTIONS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {getDocumentKindLabel(kind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DocumentsList
        documents={filteredDocuments}
        emptyTitle="Chưa có tài liệu nào"
        emptyDescription="Khi giảng viên phát hành tài liệu cho khóa học, bạn sẽ thấy chúng ở đây."
      />
    </div>
  );
}
