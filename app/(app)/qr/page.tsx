import { requireRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  await requireRole(["super_admin", "manager"]);
  const admin = createAdminClient();
  const [{ data: branches }, { data: keyRows }] = await Promise.all([
    admin.from("stores").select("id, name, code").eq("is_active", true).order("name"),
    admin.from("app_settings").select("store_id, value").eq("key", "kiosk_key"),
  ]);
  const keyByStore = new Map((keyRows ?? []).map((row: any) => [row.store_id, typeof row.value === "string" ? row.value : null]));

  return (
    <div>
      <PageHeader title="Shop QR" subtitle="Open the kiosk link on the shop POS/tablet. The QR is one-time, short-lived, and switches to break mode after 1pm." />
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-4 p-8">
        <p className="text-center text-sm text-slate-500">
          Keep the kiosk page open in fullscreen. Photos and shared screenshots expire quickly,
          and a successfully used QR cannot be reused.
        </p>
        <div className="w-full space-y-3">
          {(branches ?? []).map((branch: any) => {
            const kioskKey = keyByStore.get(branch.id);
            const kioskUrl = kioskKey ? `https://poms-chi.vercel.app/kiosk?store=${branch.id}&key=${kioskKey}` : null;
            return (
              <div key={branch.id} className="w-full rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{branch.name} POS / Kiosk link</p>
                {kioskUrl ? (
                  <>
                    <p className="break-all font-mono text-xs">{kioskUrl}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Open this on the {branch.name} POS browser, press F11 for fullscreen, done.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-amber-600">Missing kiosk key for this branch.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
