import { requireRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadQrSettings, qrToken } from "@/lib/qr";
import { todayStr } from "@/lib/tz";
import { PageHeader } from "@/components/ui";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  await requireRole(["super_admin", "manager"]);
  const admin = createAdminClient();
  const qr = await loadQrSettings(admin);
  const today = todayStr();
  const token = qrToken(qr.secret, today);
  const url = `https://poms-chi.vercel.app/login?qr=${token}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 2 });

  const { data: keyRow } = await admin.from("app_settings")
    .select("value").eq("key", "kiosk_key").limit(1).maybeSingle();
  const kioskKey = typeof keyRow?.value === "string" ? keyRow.value : null;
  const kioskUrl = kioskKey ? `https://poms-chi.vercel.app/kiosk?key=${kioskKey}` : null;

  return (
    <div>
      <PageHeader title="Shop Login QR" subtitle={`Valid for ${today} only — rotates at midnight. Show this screen on the shop POS/tablet.`} />
      <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="Daily login QR" className="w-full max-w-sm rounded-xl bg-white p-2" />
        <p className="text-center text-sm text-slate-500">
          Staff scan this with their phone camera to open the login page.
          A photo of yesterday&apos;s code stops working at midnight.
        </p>
        <p className="text-center text-xs text-slate-400">
          Mode: <span className="font-mono">{qr.mode}</span> — change in Admin → Settings (<span className="font-mono">qr_login_mode</span>).
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
