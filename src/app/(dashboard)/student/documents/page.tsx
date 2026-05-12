import { PageHeader } from "@/components/layout/page-header";

import { StudentDocumentsClient } from "./student-documents-client";

export const metadata = { title: "Tài liệu" };

export default function StudentDocumentsPage() {
  return (
    <>
      <PageHeader
        title="Tài liệu"
        description="Xem tài liệu đã phát hành cho các khóa học bạn đang tham gia."
      />
      <StudentDocumentsClient />
    </>
  );
}
