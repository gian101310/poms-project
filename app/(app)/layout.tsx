import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";
import { getPortalName } from "@/lib/settings";
import { getProjectControlSettings } from "@/lib/project-controls";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const [{ count }, portalName, { data: store }, projectControls] = await Promise.all([
    supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
      .is("read_at", null),
    getPortalName(),
    supabase.from("stores").select("name").eq("id", profile.store_id).maybeSingle(),
    getProjectControlSettings(),
  ]);

  return (
    <Shell role={profile.role} name={profile.full_name} code={profile.employee_code} unread={count ?? 0} portalName={portalName} branchName={store?.name ?? "Branch"}>
      {!projectControls.projectEnabled && profile.role !== "super_admin" ? (
        <div className="mx-auto max-w-xl p-6">
          <div className="card p-6">
            <h1 className="text-xl font-bold">Portal Temporarily Off</h1>
            <p className="mt-2 text-sm text-slate-500">Access is paused by the system owner. Try again later.</p>
          </div>
        </div>
      ) : (
        <>
          {!projectControls.projectEnabled && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Project is off for non-super-admin users.
            </div>
          )}
          {children}
        </>
      )}
    </Shell>
  );
}
