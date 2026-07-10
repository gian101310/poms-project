import { redirect } from "next/navigation";
import { getProfile } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  // Managers and admins land on the Command Center; staff on their personal day view.
  redirect(["super_admin", "manager"].includes(profile.role) ? "/overview" : "/dashboard");
}
