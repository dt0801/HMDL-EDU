import { PageHeader } from "@/components/layout/page-header";
import { InstructorDocumentsManager } from "@/components/documents/instructor-documents-manager";

export const metadata = { title: "Tài liệu" };

export default function InstructorDocumentsPage() {
  return (
    <>
      <PageHeader
        title="Tài liệu"
        description="Quản lý tài liệu theo khóa học cho giảng viên và học viên."
      />
      <InstructorDocumentsManager />
    </>
  );
}
