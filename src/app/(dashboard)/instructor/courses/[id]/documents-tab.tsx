"use client";

import { InstructorDocumentsManager } from "@/components/documents/instructor-documents-manager";

export function DocumentsTab({ courseId }: { courseId: string }) {
  return <InstructorDocumentsManager courseId={courseId} />;
}
