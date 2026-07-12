import { createAdminClient } from "@/lib/supabase/admin";
import { KioskClient } from "./kiosk-client";

export const dynamic = "force-dynamic";

// PUBLIC kiosk display — no login session. Protected by ?key=<kiosk_key>.
// Leave this open fullscreen on the shop POS/tablet; it refreshes the QR
// every few seconds and switches to break mode after 1pm Dubai time.

export default async function KioskPage({ searchParams }: { searchParams: { key?: string } }) {
  const admin = createAdminClient();
  const { data: keyRow } = await admin.from("app_settings")
    .select("value").eq("key", "kiosk_key").limit(1).maybeSingle();
  const kioskKey = typeof keyRow?.value === "string" ? keyRow.value : null;

  const authorized = !!kioskKey && searchParams.key === kioskKey;

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-bold">POMS Kiosk</h1>
          <p className="text-sm text-slate-500">
            This screen needs the kiosk link. Ask your administrator — the link is shown
            on the Shop QR page inside POMS.
          </p>
        </div>
      </div>
    );
  }

  return <KioskClient kioskKey={kioskKey} />;
}
