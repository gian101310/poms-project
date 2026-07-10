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
          Leave this page open on the shop device; refresh it each morning (or it reloads on open).
        </p>
      </div>
    </div>
  );
}
