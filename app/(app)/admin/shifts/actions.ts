"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { dow } from "@/lib/tz";
import { revalidatePath } from "next/cache";

export async function createShift(fd: FormData) {
  const profile = await requireRole(["super_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("shifts").insert({
    store_id: profile.store_id,
    name: String(fd.get("name")),
    start_time: String(fd.get("start_time")),
    end_time: String(fd.get("end_time")),
    grace_minutes: Number(fd.get("grace_minutes") ?? 10),
  });
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
  if ((end.getTime() - start.getTime()) / 86400000 > 92) return { error: "Range too long (max ~3 months at once)." };

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
