import { notFound } from "next/navigation";

import { CourseDetailClient } from "./course-detail-client";

export const metadata = { title: "Chi tiết khóa học" };

export default function InstructorCourseDetailPage({ params }: { params: { id: string } }) {
  if (!params.id) notFound();
  return <CourseDetailClient courseId={params.id} />;
}
