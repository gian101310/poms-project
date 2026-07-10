"use server";
import { requireProfile, requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function requestLeave(fd: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("leave_requests").insert({
    profile_id: profile.id,
    leave_type: String(fd.get("leave_type")),
    date_from: String(fd.get("date_from")),
    date_to: String(fd.get("date_to")),
    reason: (fd.get("reason") as string) || null,
  });
  revalidatePath("/leave");
  return error ? { error: error.message } : { ok: true };
}

export async function reviewLeave(id: string, status: "approved" | "rejected") {
  const profile = await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const { data: req, error } = await supabase.from("leave_requests").update({
    status, reviewed_by: profile.id, reviewed_at: new Date().toISOString(),
  }).eq("id", id).select("profile_id, date_from, date_to").single();

  // Approved leave marks the schedule so absent detection skips those days
  if (!error && status === "approved" && req) {
    try {
      const admin = createAdminClient();
      const from = new Date(req.date_from + "T00:00:00Z");
      const to = new Date(req.date_to + "T00:00:00Z");
      for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        await admin.from("employee_schedules").upsert(
          { profile_id: req.profile_id, work_date: dateStr, status: "leave", shift_id: null },
          { onConflict: "profile_id,work_date" }
        );
      }
      await admin.from("notifications").insert({
        recipient_id: req.profile_id, type: "leave_reviewed",
        title: `Leave ${status}`, body: `${req.date_from} → ${req.date_to}`, link: "/leave",
      });
    } catch { }
  }
  revalidatePath("/leave");
  return error ? { error: error.message } : { ok: true };
}
