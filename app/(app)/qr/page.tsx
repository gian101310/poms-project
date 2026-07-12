import { requireRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  await requireRole(["super_admin", "manager"]);
  const admin = createAdminClient();
  const { data: keyRow } = await admin.from("app_settings")
    .select("value").eq("key", "kiosk_key").limit(1).maybeSingle();
  const kioskKey = typeof keyRow?.value === "string" ? keyRow.value : null;
  const kioskUrl = kioskKey ? `https://poms-chi.vercel.app/kiosk?key=${kioskKey}` : null;

  return (
    <div>
      <PageHeader title="Shop QR" subtitle="Open the kiosk link on the shop POS/tablet. The QR is one-time, short-lived, and switches to break mode after 1pm." />
      <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-8">
        <p className="text-center text-sm text-slate-500">
          Keep the kiosk page open in fullscreen. Photos and shared screenshots expire quickly,
          and a successfully used QR cannot be reused.
        </p>
        {kioskUrl ? (
          <div className="w-full rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">POS / Kiosk link — no login needed</p>
            <p className="break-all font-mono text-xs">{kioskUrl}</p>
            <p className="mt-1 text-xs text-slate-400">
              Open this on the shop POS browser, press F11 for fullscreen, done — it refreshes itself
              and rotates at midnight. No account stays logged in on the POS.
            </p>
          </div>
        ) : (
          <p className="text-xs text-amber-600">Run migration 008 to enable the no-login kiosk link.</p>
        )}
      </div>
    </div>
  );
}
