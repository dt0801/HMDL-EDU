import { ClipboardCheck } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata = { title: "Phê duyệt nội dung" };

export default function AdminContentApprovalsPage() {
  return (
    <PlaceholderPage
      title="Phê duyệt nội dung"
      description="Phê duyệt bài học, tài liệu và nội dung trước khi phát hành."
      icon={ClipboardCheck}
    />
  );
}

