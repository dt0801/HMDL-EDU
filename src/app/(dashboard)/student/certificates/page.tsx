import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { CertificatesClient } from "./certificates-client";

export const metadata = { title: "Chứng chỉ của tôi" };

export default async function StudentCertificatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CertificatesClient studentId={user.id} />;
}
