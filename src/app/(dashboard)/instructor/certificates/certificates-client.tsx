"use client";

import { Award, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentProfile } from "@/hooks/useAuth";
import { useInstructorCertificates } from "@/hooks/useCertificates";
import { formatDateTime } from "@/lib/utils";

const ALL_COURSES = "__all__";

export function InstructorCertificatesClient() {
  const { data: profile } = useCurrentProfile();
  const { data, isLoading } = useInstructorCertificates(profile?.id);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(ALL_COURSES);

  const courseOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    for (const c of data ?? []) {
      if (c.course?.id && c.course.title) {
        map.set(c.course.id, { id: c.course.id, title: c.course.title });
      }
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [data]);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const s = search.trim().toLowerCase();
    return list.filter((c) => {
      if (courseFilter !== ALL_COURSES && c.course_id !== courseFilter) return false;
      if (!s) return true;
      const course = (c.course?.title ?? "").toLowerCase();
      const student = (c.student?.full_name ?? "").toLowerCase();
      const email = (c.student?.email ?? "").toLowerCase();
      const number = (c.cert_number ?? "").toLowerCase();
      return course.includes(s) || student.includes(s) || email.includes(s) || number.includes(s);
    });
  }, [courseFilter, data, search]);

  return (
    <>
      <PageHeader
        title="Chứng chỉ"
        description="Danh sách chứng chỉ đã cấp cho học viên trong các khóa học bạn phụ trách."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo học viên, email, số chứng chỉ, khóa học..."
                className="pl-9"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="sm:w-64">
                <SelectValue placeholder="Khóa học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COURSES}>Tất cả khóa học</SelectItem>
                {courseOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !filtered || filtered.length === 0 ? (
            <EmptyState icon={Award} title="Chưa có chứng chỉ" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số chứng chỉ</TableHead>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Ngày cấp</TableHead>
                  <TableHead className="text-right">Tải</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.cert_number}</TableCell>
                    <TableCell>{c.student?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.student?.email ?? "—"}</TableCell>
                    <TableCell className="space-x-2">
                      <span>{c.course?.title ?? "—"}</span>
                      {c.course?.category ? (
                        <Badge variant="secondary" className="align-middle">
                          {c.course.category}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(c.issued_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <a href={`/api/certificates/${c.id}`} target="_blank" rel="noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </a>
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

