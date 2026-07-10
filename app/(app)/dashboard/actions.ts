"use server";
import { headers } from "next/headers";
import { requireProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr } from "@/lib/tz";
import { loadGeoSettings, evaluateGeofence } from "@/lib/geo";
import { revalidatePath } from "next/cache";

type Coords = { lat: number; lng: number } | null;

function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

async function ipCheck(admin: any): Promise<{ allowed: boolean; flag: boolean; ip: string }> {
  const ip = clientIp();
  const { data: modeRow } = await admin.from("app_settings").select("value").eq("key", "clock_ip_mode").limit(1).maybeSingle();
  const mode = typeof modeRow?.value === "string" ? modeRow.value : "off";
  if (mode === "off") return { allowed: true, flag: false, ip };

  const { data: listRow } = await admin.from("app_settings").select("value").eq("key", "allowed_clock_ips").limit(1).maybeSingle();
  const raw = typeof listRow?.value === "string" ? listRow.value : "";
  const allow = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
  const match = allow.length === 0 || allow.some((a: string) => ip === a || ip.startsWith(a));

  if (match) return { allowed: true, flag: false, ip };
  if (mode === "block") return { allowed: false, flag: false, ip };
  return { allowed: true, flag: true, ip }; // mode === "flag"
}

export async function clockIn(coords: Coords = null) {
  const profile = await requireProfile();
  try {
    const admin = createAdminClient();
    const check = await ipCheck(admin);
    if (!check.allowed) return { error: "Clock-in is only allowed from the store network. Ask your manager if this is wrong." };

    const geo = evaluateGeofence(await loadGeoSettings(admin), profile.role, coords);
    if (!geo.allowed) return { error: geo.reason ?? "Clock-in is only allowed at the store." };
    check.flag = check.flag || geo.flag;

    const today = todayStr();
    const { data: existing } = await admin.from("attendance_records")
      .select("id, clock_in").eq("profile_id", profile.id).eq("work_date", today).maybeSingle();
    if (existing?.clock_in) return { error: "Already clocked in today." };

    const { data: sched } = await admin.from("employee_schedules")
      .select("shift_id, shifts(name, start_time, end_time, grace_minutes, standard_minutes)")
      .eq("profile_id", profile.id).eq("work_date", today).maybeSingle();

    const payload = {
      profile_id: profile.id,
      work_date: today,
      clock_in: new Date().toISOString(),
      clock_in_ip: check.ip,
      flagged: check.flag,
      shift_snapshot: sched?.shifts ?? null,
      status: "present" as const,
    };
    if (existing) {
      await admin.from("attendance_records").update(payload).eq("id", existing.id);
    } else {
      await admin.from("attendance_records").insert(payload);
    }
    revalidatePath("/dashboard");
    return check.flag
      ? { ok: true, warning: "Clock-in recorded from outside the store network — it will be reviewed." }
      : { ok: true };
  } catch (e: any) {
    return { error: e.message ?? "Clock-in failed" };
  }
}

export async function clockOut(coords: Coords = null) {
  const profile = await requireProfile();
  try {
    const admin = createAdminClient();
    const check = await ipCheck(admin);
    const geo = evaluateGeofence(await loadGeoSettings(admin), profile.role, coords);
    if (!geo.allowed) return { error: geo.reason ?? "Clock-out is only allowed at the store." };
    check.flag = check.flag || geo.flag;
    const today = todayStr();
    const { data: rec } = await admin.from("attendance_records")
      .select("id, clock_in, flagged").eq("profile_id", profile.id).eq("work_date", today).maybeSingle();
    if (!rec?.clock_in) return { error: "You have not clocked in today." };

    // Soft gate: handover must be submitted before clocking out (if a checklist exists)
    const { count: instCount } = await admin.from("checklist_instances")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id).eq("work_date", today);
    if ((instCount ?? 0) > 0) {
      const { count: ho } = await admin.from("shift_handovers")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id).eq("work_date", today).neq("status", "draft");
      if ((ho ?? 0) === 0) return { error: "Submit your shift handover before clocking out." };
    }

    const now = new Date();
    const worked = Math.max(0, Math.round((now.getTime() - new Date(rec.clock_in).getTime()) / 60000));
    await admin.from("attendance_records").update({
      clock_out: now.toISOString(),
      clock_out_ip: check.ip,
      worked_minutes: worked,
      flagged: rec.flagged || check.flag,
    }).eq("id", rec.id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e: any) {
    return { error: e.message ?? "Clock-out failed" };
  }
}
