import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentKioskPurpose, getOrCreateKioskToken } from "@/lib/one-time-qr";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const admin = createAdminClient();
  const { data: keyRow } = await admin.from("app_settings")
    .select("value").eq("key", "kiosk_key").limit(1).maybeSingle();
  const kioskKey = typeof keyRow?.value === "string" ? keyRow.value : null;
  if (!kioskKey || key !== kioskKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store } = await admin.from("stores")
    .select("id").eq("is_active", true).order("created_at").limit(1).single();
  if (!store) return NextResponse.json({ error: "No active store." }, { status: 400 });

  const purpose = currentKioskPurpose();
  const token = await getOrCreateKioskToken(admin, store.id, purpose);
  const origin = url.origin;
  const target = purpose === "break"
    ? `${origin}/break?qr=${encodeURIComponent(token.token)}`
    : `${origin}/login?qr=${encodeURIComponent(token.token)}`;
  const dataUrl = await QRCode.toDataURL(target, { width: 640, margin: 2 });

  return NextResponse.json({
    purpose,
    label: purpose === "break" ? "Break Time QR" : "Login QR",
    url: target,
    dataUrl,
    expiresAt: token.expires_at,
  });
}
