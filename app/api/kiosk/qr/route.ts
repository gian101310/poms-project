import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentKioskPurpose, getOrCreateKioskToken } from "@/lib/one-time-qr";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const storeId = url.searchParams.get("store");
  const admin = createAdminClient();
  let keyQuery = admin.from("app_settings").select("value, store_id").eq("key", "kiosk_key");
  if (storeId) keyQuery = keyQuery.eq("store_id", storeId);
  const { data: keyRow } = await keyQuery.limit(1).maybeSingle();
  const kioskKey = typeof keyRow?.value === "string" ? keyRow.value : null;
  if (!kioskKey || key !== kioskKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let storeQuery = admin.from("stores").select("id, name").eq("is_active", true);
  storeQuery = keyRow?.store_id ? storeQuery.eq("id", keyRow.store_id) : storeQuery.order("created_at").limit(1);
  const { data: store } = await storeQuery.single();
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
    branchName: store.name,
    url: target,
    dataUrl,
    expiresAt: token.expires_at,
  });
}
