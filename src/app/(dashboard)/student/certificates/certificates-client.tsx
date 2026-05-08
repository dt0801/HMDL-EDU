"use client";

import { Award, Download } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCertificates } from "@/hooks/useCertificates";
import { formatDate } from "@/lib/utils";

export function CertificatesClient({ studentId }: { studentId: string }) {
  const { data, isLoading } = useMyCertificates(studentId);

  return (
    <>
      <PageHeader
        title="Chứng chỉ của tôi"
        description="Tải chứng chỉ PDF cho các khóa học đã hoàn thành."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Bạn chưa có chứng chỉ nào"
          description="Hoàn thành khóa học và đạt bài thi cuối khóa để được cấp chứng chỉ."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 to-sky-100 p-6">
                <Award className="h-10 w-10 text-primary" />
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Chứng chỉ
                </p>
                <h3 className="font-semibold leading-tight">
                  {c.course?.title ?? "Khóa học đã xóa"}
                </h3>
                {c.course?.category ? (
                  <Badge variant="secondary" className="mt-2">
                    {c.course.category}
                  </Badge>
                ) : null}
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Số: {c.cert_number}</span>
                  <span>{formatDate(c.issued_at)}</span>
                </div>
                <Button asChild size="sm" className="w-full">
                  <a href={`/api/certificates/${c.id}`} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Tải PDF
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
