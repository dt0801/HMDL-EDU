"use client";

import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminReports, useTopCourses } from "@/hooks/useReports";

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  loading,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ReportsClient() {
  const { data, isLoading } = useAdminReports();
  const { data: topCourses, isLoading: topLoading } = useTopCourses(5);

  const completionRate =
    data && data.totalEnrollments > 0
      ? Math.round((data.completedEnrollments / data.totalEnrollments) * 1000) / 10
      : 0;

  return (
    <>
      <PageHeader
        title="Báo cáo tổng quan"
        description="Số liệu thống kê đào tạo nội bộ toàn bệnh viện."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Học viên"
          value={data?.totalStudents ?? 0}
          icon={Users}
          loading={isLoading}
          hint="Tổng nhân viên có vai trò học viên"
        />
        <StatCard
          title="Khóa học"
          value={`${data?.publishedCourses ?? 0} / ${data?.totalCourses ?? 0}`}
          icon={BookOpen}
          loading={isLoading}
          hint="Đã xuất bản / Tổng số"
        />
        <StatCard
          title="Lượt đăng ký"
          value={data?.totalEnrollments ?? 0}
          icon={GraduationCap}
          loading={isLoading}
          hint={`${data?.completedEnrollments ?? 0} đã hoàn thành`}
        />
        <StatCard
          title="Chứng chỉ đã cấp"
          value={data?.certificatesIssued ?? 0}
          icon={Award}
          loading={isLoading}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <StatCard
          title="Tỷ lệ hoàn thành"
          value={`${completionRate}%`}
          icon={CheckCircle2}
          loading={isLoading}
        />
        <StatCard
          title="Điểm thi trung bình"
          value={data?.averageScore ?? 0}
          icon={TrendingUp}
          loading={isLoading}
          hint="Tính trên các bài thi đã chấm"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top khóa học có nhiều học viên nhất</CardTitle>
          <CardDescription>Sắp xếp theo số lượt đăng ký.</CardDescription>
        </CardHeader>
        <CardContent>
          {topLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !topCourses || topCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Khóa học</TableHead>
                  <TableHead className="text-right">Lượt đăng ký</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCourses.map((c, i) => (
                  <TableRow key={c.course_id}>
                    <TableCell className="w-12 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.course_title}</TableCell>
                    <TableCell className="text-right">{c.enrollments_count}</TableCell>
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
