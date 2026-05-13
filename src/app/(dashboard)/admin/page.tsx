import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  // Use the existing Reports surface as the first useful admin landing page.
  redirect("/admin/reports");
}

