import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { InstructorCoursesGrid } from "./courses-grid";

export const metadata = { title: "Khóa học của tôi" };

export default async function InstructorCoursesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Khóa học của tôi"
        description="Quản lý các khóa đào tạo bạn phụ trách."
        actions={
          <Button asChild>
            <Link href="/instructor/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Tạo khóa học
            </Link>
          </Button>
        }
      />

      <InstructorCoursesGrid instructorId={user.id} />
    </>
  );
}
