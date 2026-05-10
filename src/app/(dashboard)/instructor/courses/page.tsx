import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { InstructorCoursesGrid } from "./courses-grid";

export const metadata = { title: "Khóa học" };

export default async function InstructorCoursesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  return (
    <>
      <PageHeader
        title={isAdmin ? "Khóa học đào tạo" : "Khóa học của tôi"}
        description={
          isAdmin
            ? "Quản lý toàn bộ khóa học và mở nhanh từng khóa để thêm bài học, đề thi."
            : "Quản lý các khóa đào tạo bạn phụ trách."
        }
        actions={
          <Button asChild>
            <Link href="/instructor/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Tạo khóa học
            </Link>
          </Button>
        }
      />

      <InstructorCoursesGrid instructorId={isAdmin ? undefined : user.id} isAdmin={isAdmin} />
    </>
  );
}
