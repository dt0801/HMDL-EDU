import { Tags } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata = { title: "Danh mục / Chuyên khoa" };

export default function AdminCategoriesPage() {
  return (
    <PlaceholderPage
      title="Danh mục / Chuyên khoa"
      description="Quản lý danh mục nội dung và chuyên khoa."
      icon={Tags}
    />
  );
}

