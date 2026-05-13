import { Settings } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata = { title: "Cấu hình" };

export default function AdminSettingsPage() {
  return (
    <PlaceholderPage
      title="Cấu hình"
      description="Cấu hình hệ thống, tích hợp và các thiết lập vận hành."
      icon={Settings}
    />
  );
}

