import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { todayStr, STORE_TZ } from "@/lib/tz";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Attendance builder — runs 23:50 Dubai time.
// Computes late / early-out / overtime for everyone who clocked in,
// marks absent anyone scheduled who never clocked in (unless on leave/holiday),
// and closes login sessions with no logout.

function minutesAtTz(iso: string): number {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const today = todayStr();
  const summary = { date: today, updated: 0, absent: 0, sessionsClosed: 0, errors: [] as string[] };

  const { data: holiday } = await admin.from("holidays").select("id").eq("date", today).limit(1);
  const isHoliday = !!holiday?.length;

  const { data: schedules } = await admin.from("employee_schedules")
    .select("profile_id, status, shifts(name, start_time, end_time, grace_minutes)")
    .eq("work_date", today);

  for (const sched of schedules ?? []) {
    const shift: any = (sched as any).shifts;
    const { data: rec } = await admin.from("attendance_records")
      .select("*").eq("profile_id", sched.profile_id).eq("work_date", today).maybeSingle();

    if (sched.status === "leave") {
      await admin.from("attendance_records").upsert({
        profile_id: sched.profile_id, work_date: today,
        status: "on_leave", clock_in: rec?.clock_in ?? null, clock_out: rec?.clock_out ?? null,
      }, { onConflict: "profile_id,work_date" });
      continue;
    }
    if (sched.status !== "scheduled" || !shift) continue;

    if (isHoliday && !rec?.clock_in) {
      await admin.from("attendance_records").upsert({
        profile_id: sched.profile_id, work_date: today, status: "holiday",
      }, { onConflict: "profile_id,work_date" });
      continue;
    }

    if (!rec?.clock_in) {
      // Scheduled, no clock-in → absent
      const { error } = await admin.from("attendance_records").upsert({
        profile_id: sched.profile_id, work_date: today, status: "absent",
        shift_snapshot: shift,
      }, { onConflict: "profile_id,work_date" });
      if (error) summary.errors.push(error.message); else summary.absent++;

      await admin.from("notifications").insert({
        recipient_id: sched.profile_id, type: "attendance",
        title: "Marked absent today", body: "Contact your supervisor if this is a mistake.", link: "/attendance",
      });
      continue;
    }

    // Late / early-out / overtime
    const startMin = toMin(shift.start_time);
    const endMin = toMin(shift.end_time);
    const grace = shift.grace_minutes ?? 10;
    const inMin = minutesAtTz(rec.clock_in);
    const outMin = rec.clock_out ? minutesAtTz(rec.clock_out) : null;

    const late = Math.max(0, inMin - (startMin + grace));
    const earlyOut = outMin != null ? Math.max(0, endMin - outMin) : 0;
    const overtime = outMin != null ? Math.max(0, outMin - endMin) : 0;

    const { error } = await admin.from("attendance_records").update({
      late_minutes: late,
      early_out_minutes: earlyOut,
      overtime_minutes: overtime,
      status: late > 0 ? "late" : "present",
      shift_snapshot: rec.shift_snapshot ?? shift,
    }).eq("id", rec.id);
    if (error) summary.errors.push(error.message); else summary.updated++;
  }

  // Close login sessions that never logged out (browser closed, etc.)
  const cutoff = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const { data: stale } = await admin.from("login_sessions")
    .select("id, last_activity_at").is("logout_at", null).lt("last_activity_at", cutoff);
  for (const s of stale ?? []) {
    await admin.from("login_sessions").update({
      logout_at: s.last_activity_at, closed_by: "system",
    }).eq("id", s.id);
    summary.sessionsClosed++;
  }

  return NextResponse.json(summary);
}
