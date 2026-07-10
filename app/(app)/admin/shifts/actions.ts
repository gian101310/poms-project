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

// Rotating counterpart pair: A and B swap shifts every N weeks, anchored on start date.
// Approved-leave days already on the schedule are preserved (not overwritten).
export async function generateRotation(fd: FormData) {
  const admin = await requireRole(["super_admin"]);
  const supabase = createClient();
  const a = String(fd.get("profile_a"));
  const b = String(fd.get("profile_b"));
  const shiftA = String(fd.get("shift_a"));
  const shiftB = String(fd.get("shift_b"));
  const startStr = String(fd.get("start_date"));
  const untilStr = String(fd.get("until_date"));
  const rotateWeeks = Math.max(1, Number(fd.get("rotate_weeks") ?? 2));
  const days = fd.getAll("days").map(Number);

  if (a === b) return { error: "Pick two different employees." };
  if (shiftA === shiftB) return { error: "Pick two different shifts." };
  if (!days.length) return { error: "Select at least one work day." };

  const start = new Date(startStr + "T00:00:00Z");
  const until = new Date(untilStr + "T00:00:00Z");
  if (until < start) return { error: "'Until' is before start." };
  if ((until.getTime() - start.getTime()) / 86400000 > 190) return { error: "Range too long (max ~6 months). Re-run it each season." };
  if (start.getUTCDay() !== 1) return { error: "Start date must be a Monday (rotation swaps on Mondays)." };

  // Preserve existing leave days
  const { data: leaveDays } = await supabase.from("employee_schedules")
    .select("profile_id, work_date").in("profile_id", [a, b])
    .gte("work_date", startStr).lte("work_date", untilStr).eq("status", "leave");
  const leaveSet = new Set((leaveDays ?? []).map((l: any) => `${l.profile_id}|${l.work_date}`));

  const rows: any[] = [];
  for (let d = new Date(start); d <= until; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    if (!days.includes(dow(dateStr))) continue;
    const weekIndex = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000));
    const swapped = Math.floor(weekIndex / rotateWeeks) % 2 === 1;
    const aShift = swapped ? shiftB : shiftA;
    const bShift = swapped ? shiftA : shiftB;
    if (!leaveSet.has(`${a}|${dateStr}`)) {
      rows.push({ profile_id: a, shift_id: aShift, work_date: dateStr, status: "scheduled", created_by: admin.id });
    }
    if (!leaveSet.has(`${b}|${dateStr}`)) {
      rows.push({ profile_id: b, shift_id: bShift, work_date: dateStr, status: "scheduled", created_by: admin.id });
    }
  }
  if (!rows.length) return { error: "No schedule days generated." };

  const { error } = await supabase.from("employee_schedules")
    .upsert(rows, { onConflict: "profile_id,work_date" });
  revalidatePath("/admin/shifts");
  return error ? { error: error.message } : { ok: true, created: rows.length };
}
