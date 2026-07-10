import { createAdminClient } from "@/lib/supabase/admin";
import { loadQrSettings, qrToken } from "@/lib/qr";
import { todayStr } from "@/lib/tz";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// PUBLIC kiosk display — no login session. Protected by ?key=<kiosk_key>.
// Leave this open fullscreen on the shop POS/tablet; it reloads itself
// every 10 minutes so the QR rotates at midnight automatically.

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

  const qr = await loadQrSettings(admin);
  const today = todayStr();
  const token = qrToken(qr.secret, today);
  const url = `https://poms-chi.vercel.app/login?qr=${token}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 640, margin: 2 });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {/* auto-reload every 10 minutes so the code rotates at midnight */}
      <meta httpEquiv="refresh" content="600" />
      <h1 className="text-2xl font-bold">Scan to Log In</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Daily login QR" className="w-full max-w-md rounded-2xl bg-white p-3 shadow-lg" />
      <p className="text-sm text-slate-500">Point your phone camera at the code · Valid for {today}</p>
    </div>
  );
}
