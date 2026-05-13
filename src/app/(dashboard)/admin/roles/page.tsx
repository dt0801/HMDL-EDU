import { Shield } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata = { title: "Vai trò & quyền hạn" };

export default function AdminRolesPage() {
  return (
    <PlaceholderPage
      title="Vai trò & quyền hạn"
      description="Thiết lập quyền theo vai trò và phân quyền chi tiết."
      icon={Shield}
    />
  );
}

