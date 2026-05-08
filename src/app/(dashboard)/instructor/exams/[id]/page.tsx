import { notFound } from "next/navigation";

import { ExamDetailClient } from "./exam-detail-client";

export const metadata = { title: "Chi tiết đề thi" };

export default function ExamDetailPage({ params }: { params: { id: string } }) {
  if (!params.id) notFound();
  return <ExamDetailClient examId={params.id} />;
}
