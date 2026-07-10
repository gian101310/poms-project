"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { dow } from "@/lib/tz";
import { revalidatePath } from "next/cache";

function shiftPayload(fd: FormData) {
  const stdHours = fd.get("standard_hours");
  return {
    name: String(fd.get("name")),
    start_time: String(fd.get("start_time")),
    end_time: String(fd.get("end_time")),
    grace_minutes: Number(fd.get("grace_minutes") ?? 10),
    standard_minutes: stdHours ? Math.round(Number(stdHours) * 60) : null,
  };
}

export async function createShift(fd: FormData) {
  const profile = await requireRole(["super_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("shifts").insert({
    store_id: profile.store_id, ...shiftPayload(fd),
  });
  revalidatePath("/admin/shifts");
  return error ? { error: error.message } : { ok: true };
}

export async function updateShift(id: string, fd: FormData) {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("shifts").update({
    ...shiftPayload(fd),
    is_active: fd.get("is_active") === "on",
  }).eq("id", id);
  revalidatePath("/admin/shifts");
  return error ? { error: error.message } : { ok: true };
}

export async function assignSchedule(fd: FormData) {
  const profile = await requireRole(["super_admin"]);
  const supabase = createClient();
  const profileId = String(fd.get("profile_id"));
  const shiftId = String(fd.get("shift_id"));
  const from = String(fd.get("date_from"));
  const to = String(fd.get("date_to"));
  const days = fd.getAll("days").map(Number);
  if (!days.length) return { error: "Select at least one work day." };

  const rows: any[] = [];
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  if (end < start) return { error: "'To' date is before 'From' date." };
  if ((end.getTime() - start.getTime()) / 86400000 > 190) return { error: "Range too long (max ~6 months)." };

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    if (days.includes(dow(dateStr))) {
      rows.push({ profile_id: profileId, shift_id: shiftId, work_date: dateStr, status: "scheduled", created_by: profile.id });
    }
  }
  if (!rows.length) return { error: "No matching days in that range." };

  const { error } = await supabase.from("employee_schedules")
    .upsert(rows, { onConflict: "profile_id,work_date" });
  revalidatePath("/admin/shifts");
  return error ? { error: error.message } : { ok: true };
}

// Rotating group: 2, 3, or more employees cycle through the same number of
// shifts every N weeks (anchored on a Monday). Each cycle everyone moves to
// the next shift in the list. Approved-leave days are preserved.
export async function generateRotation(fd: FormData) {
  const admin = await requireRole(["super_admin"]);
  const supabase = createClient();
  const people = fd.getAll("rot_profile").map(String).filter(Boolean);
  const startShifts = fd.getAll("rot_shift").map(String).filter(Boolean);
  const startStr = String(fd.get("start_date"));
  const untilStr = String(fd.get("until_date"));
  const rotateWeeks = Math.max(1, Number(fd.get("rotate_weeks") ?? 2));
  const days = fd.getAll("days").map(Number);
  const n = people.length;

  if (n < 2) return { error: "Pick at least two employees." };
  if (startShifts.length !== n) return { error: "Assign a starting shift to every employee." };
  if (new Set(people).size !== n) return { error: "Each employee can only appear once." };
  if (new Set(startShifts).size !== n) return { error: "Each employee needs a different starting shift." };
  if (!days.length) return { error: "Select at least one work day." };

  const start = new Date(startStr + "T00:00:00Z");
  const until = new Date(untilStr + "T00:00:00Z");
  if (until < start) return { error: "'Until' is before start." };
  if ((until.getTime() - start.getTime()) / 86400000 > 190) return { error: "Range too long (max ~6 months). Re-run it each season." };
  if (start.getUTCDay() !== 1) return { error: "Start date must be a Monday (rotation changes on Mondays)." };

  // Preserve existing leave days
  const { data: leaveDays } = await supabase.from("employee_schedules")
    .select("profile_id, work_date").in("profile_id", people)
    .gte("work_date", startStr).lte("work_date", untilStr).eq("status", "leave");
  const leaveSet = new Set((leaveDays ?? []).map((l: any) => `${l.profile_id}|${l.work_date}`));

  const rows: any[] = [];
  for (let d = new Date(start); d <= until; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    if (!days.includes(dow(dateStr))) continue;
    const weekIndex = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000));
    const cycle = Math.floor(weekIndex / rotateWeeks); // everyone advances one shift per cycle
    for (let i = 0; i < n; i++) {
      const shift = startShifts[(i + cycle) % n];
      if (leaveSet.has(`${people[i]}|${dateStr}`)) continue;
      rows.push({ profile_id: people[i], shift_id: shift, work_date: dateStr, status: "scheduled", created_by: admin.id });
    }
  }
  if (!rows.length) return { error: "No schedule days generated." };

  const { error } = await supabase.from("employee_schedules")
    .upsert(rows, { onConflict: "profile_id,work_date" });
  revalidatePath("/admin/shifts");
  return error ? { error: error.message } : { ok: true, created: rows.length };
}
