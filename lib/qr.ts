// Rotating daily QR login token: HMAC(qr_secret, YYYY-MM-DD in store tz).
// Yesterday's token stays valid for grace around midnight.
import { createHmac } from "crypto";
import { todayStr, STORE_TZ } from "@/lib/tz";

export function qrToken(secret: string, dateStr: string): string {
  return createHmac("sha256", secret).update(dateStr).digest("hex").slice(0, 20);
}

export function validQrToken(secret: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const today = todayStr();
  const yesterday = new Date(new Date(today + "T00:00:00Z").getTime() - 86400000)
    .toISOString().slice(0, 10);
  return token === qrToken(secret, today) || token === qrToken(secret, yesterday);
}

export async function loadQrSettings(db: any, storeId?: string): Promise<{ mode: "off" | "flag" | "block"; secret: string }> {
  let query = db.from("app_settings").select("store_id, key, value").in("key", ["qr_login_mode", "qr_secret"]);
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query;
  const map: Record<string, any> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return {
    mode: (["off", "flag", "block"].includes(map.qr_login_mode) ? map.qr_login_mode : "off"),
    secret: typeof map.qr_secret === "string" ? map.qr_secret : "",
  };
}
