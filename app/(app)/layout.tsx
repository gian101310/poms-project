import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";
import { getPortalName } from "@/lib/settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const [{ count }, portalName, { data: store }] = await Promise.all([
    supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
      .is("read_at", null),
    getPortalName(),
    supabase.from("stores").select("name").eq("id", profile.store_id).maybeSingle(),
  ]);

  return (
    <Shell role={profile.role} name={profile.full_name} code={profile.employee_code} unread={count ?? 0} portalName={portalName} branchName={store?.name ?? "Branch"}>
      {children}
    </Shell>
  );
}
