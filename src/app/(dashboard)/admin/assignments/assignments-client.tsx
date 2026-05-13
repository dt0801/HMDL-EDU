"use client";

import { UserCog } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCourses } from "@/hooks/useCourses";
import { useUsers } from "@/hooks/useUsers";
import { createClient } from "@/lib/supabase/client";

export function AdminAssignmentsClient() {
  const supabase = createClient();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: users, isLoading: usersLoading } = useUsers();

  const instructors = useMemo(() => {
    return (users ?? []).filter((u) => u.role === "instructor");
  }, [users]);

  const loading = coursesLoading || usersLoading;

  const handleAssign = async (courseId: string, instructorId: string | null) => {
    const { error } = await supabase
      .from("courses")
      .update({ instructor_id: instructorId })
      .eq("id", courseId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã cập nhật giảng viên.");
  };

  return (
    <>
      <PageHeader
        title="Phân công giảng viên"
        description="Gán giảng viên phụ trách cho từng khóa học."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : !courses || courses.length === 0 ? (
            <EmptyState icon={UserCog} title="Chưa có khóa học" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Giảng viên</TableHead>
                  <TableHead className="text-right">Lưu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Select
                        value={c.instructor_id ?? "__none__"}
                        onValueChange={(v) => void handleAssign(c.id, v === "__none__" ? null : v)}
                      >
                        <SelectTrigger className="sm:w-72">
                          <SelectValue placeholder="Chọn giảng viên" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Chưa gán —</SelectItem>
                          {instructors.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" disabled>
                        Auto
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

