import { randomBytes } from "crypto";
import { nowTimeStr } from "@/lib/tz";

export type QrPurpose = "login" | "break";

export function currentKioskPurpose() {
  return nowTimeStr() >= "13:00" ? "break" : "login";
}

export function makeOneTimeToken() {
  return randomBytes(24).toString("base64url");
}

export async function tokenTtlSeconds(admin: any, storeId?: string) {
  let query = admin.from("app_settings").select("value").eq("key", "qr_token_ttl_seconds");
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query.limit(1).maybeSingle();
  const ttl = Number(data?.value ?? 45);
  return Number.isFinite(ttl) ? Math.max(15, Math.min(120, ttl)) : 45;
}

export async function getOrCreateKioskToken(admin: any, storeId: string, purpose: QrPurpose) {
  const nowIso = new Date().toISOString();
  const { data: existing } = await admin.from("qr_tokens")
    .select("id, token, purpose, expires_at")
    .eq("store_id", storeId)
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const ttl = await tokenTtlSeconds(admin, storeId);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  const { data, error } = await admin.from("qr_tokens").insert({
    store_id: storeId,
    token: makeOneTimeToken(),
    purpose,
    expires_at: expiresAt,
  }).select("id, token, purpose, expires_at").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function consumeQrToken(admin: any, token: string | null | undefined, purpose: QrPurpose, userId: string) {
  if (!token) return { ok: false, reason: "Scan the current shop QR code." };
  const { data, error } = await admin.from("qr_tokens")
    .select("id, store_id, purpose, expires_at, used_at")
    .eq("token", token)
    .eq("purpose", purpose)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "QR code is not valid. Scan the current shop screen." };
  if (data.used_at) return { ok: false, reason: "QR code was already used. Scan the new code on the shop screen." };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "QR code expired. Scan the current shop screen." };
  }
  const { error: updateError } = await admin.from("qr_tokens")
    .update({ used_at: new Date().toISOString(), used_by: userId })
    .eq("id", data.id)
    .is("used_at", null);
  if (updateError) return { ok: false, reason: updateError.message };
  return { ok: true, tokenId: data.id, storeId: data.store_id };
}
