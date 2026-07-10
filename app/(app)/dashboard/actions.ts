"use server";
import { requireProfile } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr } from "@/lib/tz";
import { revalidatePath } from "next/cache";

export async function clockIn() {
  const profile = await requireProfile();
  try {
    const admin = createAdminClient();
    const today = todayStr();
    const { data: existing } = await admin.from("attendance_records")
      .select("id, clock_in").eq("profile_id", profile.id).eq("work_date", today).maybeSingle();
    if (existing?.clock_in) return { error: "Already clocked in today." };

    const { data: sched } = await admin.from("employee_schedules")
      .select("shift_id, shifts(name, start_time, end_time, grace_minutes)")
      .eq("profile_id", profile.id).eq("work_date", today).maybeSingle();

    const payload = {
      profile_id: profile.id,
      work_date: today,
      clock_in: new Date().toISOString(),
      shift_snapshot: sched?.shifts ?? null,
      status: "present" as const,
    };
    if (existing) {
      await admin.from("attendance_records").update(payload).eq("id", existing.id);
    } else {
      await admin.from("attendance_records").insert(payload);
    }
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e: any) {
    return { error: e.message ?? "Clock-in failed" };
  }
}

export async function clockOut() {
  const profile = await requireProfile();
  try {
    const admin = createAdminClient();
    const today = todayStr();
    const { data: rec } = await admin.from("attendance_records")
      .select("id, clock_in").eq("profile_id", profile.id).eq("work_date", today).maybeSingle();
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

    await admin.from("attendance_records").update({ clock_out: new Date().toISOString() }).eq("id", rec.id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e: any) {
    return { error: e.message ?? "Clock-out failed" };
  }
}
