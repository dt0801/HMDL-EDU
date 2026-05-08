import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { LearnClient } from "./learn-client";

export const metadata = { title: "Học bài" };

export default async function LearnPage({ params }: { params: { id: string } }) {
  if (!params.id) notFound();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <LearnClient courseId={params.id} studentId={user.id} />;
}
