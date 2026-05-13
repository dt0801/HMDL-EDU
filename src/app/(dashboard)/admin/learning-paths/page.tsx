import { Route } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata = { title: "Lộ trình đào tạo" };

export default function AdminLearningPathsPage() {
  return (
    <PlaceholderPage
      title="Lộ trình đào tạo"
      description="Tạo và quản lý lộ trình đào tạo theo phòng ban/chức danh."
      icon={Route}
    />
  );
}

