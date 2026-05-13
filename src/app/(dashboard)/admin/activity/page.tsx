import { Activity } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata = { title: "Hoạt động gần đây" };

export default function AdminActivityPage() {
  return (
    <PlaceholderPage
      title="Hoạt động gần đây"
      description="Theo dõi các thay đổi và hoạt động trong hệ thống."
      icon={Activity}
    />
  );
}

