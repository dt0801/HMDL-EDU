import { ExamDetailClient } from "@/app/(dashboard)/instructor/exams/[id]/exam-detail-client";

export const metadata = { title: "Chi tiết đề thi" };

export default function AdminExamDetailPage({ params }: { params: { id: string } }) {
  return <ExamDetailClient examId={params.id} />;
}

