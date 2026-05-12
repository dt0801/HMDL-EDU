"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DocumentsList } from "@/components/documents/documents-list";
import { DocumentDialog } from "@/components/documents/document-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentProfile } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import {
  useCreateDocument,
  useDeleteDocument,
  getDocumentKindLabel,
  useInstructorDocuments,
  useUpdateDocument,
  type CourseDocumentWithCourse,
} from "@/hooks/useDocuments";
import type { CourseDocumentInput } from "@/lib/validations/course-document.schema";
import type { CourseDocumentKind } from "@/types/database.types";

const ALL_COURSES = "__all__";
const ALL_KINDS = "__all__";

const DOCUMENT_KIND_OPTIONS: CourseDocumentKind[] = [
  "procedure",
  "template",
  "slide",
  "reference",
  "policy",
  "other",
];

export function InstructorDocumentsManager({ courseId }: { courseId?: string }) {
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: profile } = useCurrentProfile();
  const [selectedCourseId, setSelectedCourseId] = useState(courseId ?? ALL_COURSES);
  const [selectedKind, setSelectedKind] = useState<string>(ALL_KINDS);
  const activeCourseId = courseId ?? (selectedCourseId === ALL_COURSES ? undefined : selectedCourseId);

  const { data: documents = [], isLoading: documentsLoading } = useInstructorDocuments(activeCourseId);
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  const [open, setOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<CourseDocumentWithCourse | null>(null);

  const selectableCourses = useMemo(
    () => courses.map((course) => ({ id: course.id, title: course.title })),
    [courses]
  );

  const filteredDocuments = useMemo(() => {
    if (selectedKind === ALL_KINDS) return documents;
    return documents.filter((document) => document.document_kind === selectedKind);
  }, [documents, selectedKind]);

  const startCreate = () => {
    setEditingDocument(null);
    setOpen(true);
  };

  const startEdit = (document: CourseDocumentWithCourse) => {
    setEditingDocument(document);
    setOpen(true);
  };

  const handleSubmit = (input: CourseDocumentInput) => {
    if (!profile?.id) {
      toast.error("Không xác định được người dùng hiện tại.");
      return;
    }

    const mutation = editingDocument
      ? updateDocument.mutateAsync({ id: editingDocument.id, ...input })
      : createDocument.mutateAsync({ ...input, uploaded_by: profile.id });

    mutation
      .then(() => {
        toast.success(editingDocument ? "Đã cập nhật tài liệu" : "Đã thêm tài liệu");
        setOpen(false);
        setEditingDocument(null);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không lưu được tài liệu");
      });
  };

  const handleDelete = async (document: CourseDocumentWithCourse) => {
    if (!window.confirm(`Xóa tài liệu "${document.title}"?`)) return;

    try {
      await deleteDocument.mutateAsync({
        id: document.id,
        courseId: document.course_id,
        fileUrl: document.file_url,
      });
      toast.success("Đã xóa tài liệu");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được tài liệu");
    }
  };

  if (!coursesLoading && selectableCourses.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Chưa có khóa học để gắn tài liệu"
        description="Hãy tạo khóa học trước, sau đó bạn có thể tải tài liệu cho từng khóa."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl">
            {!courseId ? (
              <div className="space-y-2">
                <Label>Lọc theo khóa học</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_COURSES}>Tất cả khóa học</SelectItem>
                    {selectableCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Lọc theo loại tài liệu</Label>
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
          </div>

          <Button onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm tài liệu
          </Button>
        </CardContent>
      </Card>

      {documentsLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Đang tải danh sách tài liệu...
          </CardContent>
        </Card>
      ) : (
        <DocumentsList
          documents={filteredDocuments}
          emptyTitle="Chưa có tài liệu nào"
          emptyDescription="Tải lên tài liệu hướng dẫn, quy trình hoặc file học tập cho khóa học."
          showCourse={!courseId}
          canManage
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      )}

      <DocumentDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setEditingDocument(null);
        }}
        document={editingDocument}
        courses={selectableCourses}
        defaultCourseId={
          courseId ??
          (selectedCourseId === ALL_COURSES ? selectableCourses[0]?.id : selectedCourseId)
        }
        lockCourse={!!courseId}
        onSubmit={handleSubmit}
        isSubmitting={createDocument.isPending || updateDocument.isPending}
      />
    </div>
  );
}
