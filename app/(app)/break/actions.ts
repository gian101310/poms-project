"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadGeoSettings, evaluateGeofence } from "@/lib/geo";
import { consumeQrToken } from "@/lib/one-time-qr";
import { todayStr } from "@/lib/tz";

type Coords = { lat: number; lng: number } | null;

async function allowedBreakMinutes(admin: any, storeId: string) {
  const { data } = await admin.from("app_settings")
    .select("value").eq("store_id", storeId).eq("key", "break_allowed_minutes")
    .maybeSingle();
  const value = Number(data?.value ?? 60);
  return Number.isFinite(value) ? value : 60;
}

async function activeSessionId(profileId: string, admin: any) {
  const sessionId = cookies().get("poms_session_id")?.value;
  if (!sessionId) return { error: "No active device session. Log in again from the shop QR." };
  const { data } = await admin.from("login_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("profile_id", profileId)
    .is("logout_at", null)
    .maybeSingle();
  return data?.id ? { id: data.id } : { error: "This device session is no longer active. Log in again." };
}

async function gate(admin: any, profile: any, coords: Coords, qrToken: string) {
  const geo = evaluateGeofence(await loadGeoSettings(admin), profile.role, coords);
  if (!geo.allowed) {
    return {
      allowed: false,
      error: geo.reason,
      flagged: geo.flag,
      distance: geo.distance,
      tokenId: null,
    };
  }

  const qr = await consumeQrToken(admin, qrToken, "break", profile.id);
  const reasons = [geo.allowed ? null : geo.reason, qr.ok ? null : qr.reason].filter(Boolean);
  return {
    allowed: geo.allowed && qr.ok,
    error: reasons.join(" "),
    flagged: geo.flag,
    distance: geo.distance,
    tokenId: qr.ok ? qr.tokenId : null,
  };
}

export async function startBreak(qrToken: string, coords: Coords = null) {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const session = await activeSessionId(profile.id, admin);
  if (session.error) return { error: session.error };

  const today = todayStr();
  const { data: attendance } = await admin.from("attendance_records")
    .select("clock_in, clock_out")
    .eq("profile_id", profile.id)
    .eq("work_date", today)
    .maybeSingle();
  if (!attendance?.clock_in) return { error: "Clock in before starting break." };
  if (attendance.clock_out) return { error: "Shift is already finished." };

  const { data: open } = await admin.from("break_sessions")
    .select("id, started_at")
    .eq("profile_id", profile.id)
    .is("ended_at", null)
    .maybeSingle();
  if (open) return { error: "You are already on break. End the current break first." };

  const check = await gate(admin, profile, coords, qrToken);
  if (!check.allowed) return { error: check.error || "Break QR/location check failed." };

  const { error } = await admin.from("break_sessions").insert({
    profile_id: profile.id,
    store_id: profile.store_id,
    work_date: today,
    login_session_id: session.id,
    start_latitude: coords?.lat ?? null,
    start_longitude: coords?.lng ?? null,
    start_distance_m: check.distance,
    start_qr_token_id: check.tokenId,
    flagged: check.flagged,
    flag_reason: check.flagged ? "Started break with location/network flag." : null,
  });
  revalidatePath("/break");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  return error ? { error: error.message } : { ok: true };
}

export async function endBreak(qrToken: string, coords: Coords = null) {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const session = await activeSessionId(profile.id, admin);
  if (session.error) return { error: session.error };

  const { data: open } = await admin.from("break_sessions")
    .select("*")
    .eq("profile_id", profile.id)
    .is("ended_at", null)
    .maybeSingle();
  if (!open) return { error: "No active break found." };

  const check = await gate(admin, profile, coords, qrToken);
  if (!check.allowed) return { error: check.error || "Break QR/location check failed." };

  const endedAt = new Date();
  const duration = Math.max(0, Math.round((endedAt.getTime() - new Date(open.started_at).getTime()) / 60000));
  const allowed = await allowedBreakMinutes(admin, profile.store_id);
  const overLimit = duration > allowed;
  const flagReason = [
    open.flag_reason,
    check.flagged ? "Ended break with location/network flag." : null,
    overLimit ? `Break exceeded ${allowed} minutes.` : null,
  ].filter(Boolean).join(" ");

  const { error } = await admin.from("break_sessions").update({
    ended_at: endedAt.toISOString(),
    duration_minutes: duration,
    end_latitude: coords?.lat ?? null,
    end_longitude: coords?.lng ?? null,
    end_distance_m: check.distance,
    end_qr_token_id: check.tokenId,
    flagged: open.flagged || check.flagged || overLimit,
    flag_reason: flagReason || null,
    updated_at: endedAt.toISOString(),
  }).eq("id", open.id);
  revalidatePath("/break");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  revalidatePath("/attendance");
  return error ? { error: error.message } : { ok: true, duration };
}
