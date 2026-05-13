import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export function PlaceholderPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title="Đang phát triển" description="Trang này sẽ sớm được hoàn thiện." />
    </>
  );
}

