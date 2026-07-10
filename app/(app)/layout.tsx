import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .is("read_at", null);

  return (
    <Shell role={profile.role} name={profile.full_name} code={profile.employee_code} unread={count ?? 0}>
      {children}
    </Shell>
  );
}
