import { ScrollText } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata = { title: "Nhật ký hoạt động" };

export default function AdminAuditLogPage() {
  return (
    <PlaceholderPage
      title="Nhật ký hoạt động"
      description="Lưu vết các thao tác quản trị và thay đổi dữ liệu quan trọng."
      icon={ScrollText}
    />
  );
}

