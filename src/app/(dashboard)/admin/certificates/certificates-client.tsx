"use client";

import { Award, ExternalLink, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CertificateDownloadActions } from "@/components/certificates/certificate-download-actions";
import { CertificateTemplateDesigner } from "@/components/certificates/certificate-template-designer";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCertificateTemplates,
  useCreateCertificateTemplate,
  useIssueCertificate,
} from "@/hooks/useCertificateGenerator";
import { useCourses } from "@/hooks/useCourses";
import { useAdminCertificates } from "@/hooks/useAdminData";
import { useUsers } from "@/hooks/useUsers";
import { formatDate, formatDateTime } from "@/lib/utils";

export function AdminCertificatesClient() {
  const { data, isLoading } = useAdminCertificates();
  const { data: templates = [], isLoading: templatesLoading } = useCertificateTemplates();
  const { data: courses = [] } = useCourses();
  const { data: users = [] } = useUsers();
  const createTemplate = useCreateCertificateTemplate();
  const issueCertificate = useIssueCertificate();
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const students = useMemo(
    () => users.filter((user) => user.role === "student" && user.is_active),
    [users]
  );

  const selectableTemplates = useMemo(
    () =>
      templates.filter((template) => {
        if (!courseId) return true;
        return template.course_id == null || template.course_id === courseId;
      }),
    [courseId, templates]
  );

  const handleIssue = async () => {
    if (!studentId || !courseId) {
      toast.error("Vui lòng chọn học viên và khóa học.");
      return;
    }

    try {
      const issued = await issueCertificate.mutateAsync({
        studentId,
        courseId,
        templateId: templateId || null,
      });
      toast.success(`Đã cấp chứng chỉ ${issued.certificateCode}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không cấp được chứng chỉ.");
    }
  };

  return (
    <>
      <PageHeader
        title="Chứng chỉ"
        description="Thiết kế template, cấp chứng chỉ và quản lý chứng chỉ đã phát hành."
      />

      <Tabs defaultValue="issued">
        <TabsList>
          <TabsTrigger value="issued">Đã cấp</TabsTrigger>
          <TabsTrigger value="templates">Template</TabsTrigger>
          <TabsTrigger value="issue">Cấp chứng chỉ</TabsTrigger>
        </TabsList>

        <TabsContent value="issued">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : !data || data.length === 0 ? (
                <EmptyState icon={Award} title="Chưa có chứng chỉ" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số chứng chỉ</TableHead>
                      <TableHead>Học viên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Khóa học</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Ngày cấp</TableHead>
                      <TableHead className="text-right">Tải</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((c) => {
                      const code = c.certificate_code ?? c.cert_number;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <span>{code}</span>
                              <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                                <Link href={`/verify/${encodeURIComponent(code)}`} target="_blank">
                                  Verify <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{c.student?.full_name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{c.student?.email ?? "—"}</TableCell>
                          <TableCell>{c.course?.title ?? "—"}</TableCell>
                          <TableCell>
                            {c.template ? <Badge variant="secondary">{c.template.name}</Badge> : "Mặc định"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(c.issued_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <CertificateDownloadActions
                              certificateId={c.id}
                              pdfUrl={c.pdf_url}
                              imageUrl={c.image_url}
                              templateJSON={c.template?.canvas_json}
                              width={c.template?.width}
                              height={c.template?.height}
                              data={{
                                studentName: c.student?.full_name ?? "Học viên",
                                courseName: c.course?.title ?? "Khóa học",
                                issuedDate: formatDate(c.issued_at),
                                certificateCode: code,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <CertificateTemplateDesigner
            courses={courses.map((course) => ({ id: course.id, title: course.title }))}
            isSaving={createTemplate.isPending}
            onSave={async (input) => {
              await createTemplate.mutateAsync(input);
              toast.success("Đã lưu template chứng chỉ.");
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template đã lưu</CardTitle>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : templates.length === 0 ? (
                <EmptyState icon={Award} title="Chưa có template" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên mẫu</TableHead>
                      <TableHead>Khóa học</TableHead>
                      <TableHead>Kích thước</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.course?.title ?? "Dùng chung"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.width} x {template.height}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(template.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cấp chứng chỉ thủ công</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Học viên</label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn học viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Khóa học</label>
                <Select
                  value={courseId}
                  onValueChange={(value) => {
                    setCourseId(value);
                    setTemplateId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khóa học" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Template</label>
                <Select value={templateId || "__default__"} onValueChange={(value) => setTemplateId(value === "__default__" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">PDF mặc định</SelectItem>
                    {selectableTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" onClick={handleIssue} disabled={issueCertificate.isPending}>
                {issueCertificate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Cấp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
