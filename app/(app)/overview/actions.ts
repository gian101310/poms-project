"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { todayStr } from "@/lib/tz";

export async function addFollowup(fd: FormData) {
  const profile = await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const { error } = await supabase.from("followup_tasks").insert({
    department_id: String(fd.get("department_id")),
    profile_id: (fd.get("profile_id") as string) || null,
    title: String(fd.get("title")),
    note: (fd.get("note") as string) || null,
    priority: String(fd.get("priority") ?? "high"),
    target_date: String(fd.get("target_date")),
    created_by: profile.id,
  });
  revalidatePath("/overview");
  return error ? { error: error.message } : { ok: true };
}

export async function toggleDelivery(profileId: string, currentlyOut: boolean) {
  const actor = await requireRole(["super_admin", "manager"]);
  const admin = createAdminClient();
  const today = todayStr();

  if (currentlyOut) {
    const { error } = await admin.from("staff_delivery_runs").update({
      ended_at: new Date().toISOString(),
      ended_by: actor.id,
    })
      .eq("profile_id", profileId)
      .is("ended_at", null);
    revalidatePath("/overview");
    return error ? { error: error.message } : { ok: true };
  }

  const { data: staff, error: staffError } = await admin.from("profiles")
    .select("id, store_id, status")
    .eq("id", profileId)
    .single();
  if (staffError || !staff || staff.status !== "active") {
    return { error: "Staff member is not active." };
  }

  const { error } = await admin.from("staff_delivery_runs").insert({
    profile_id: profileId,
    store_id: staff.store_id,
    work_date: today,
    started_by: actor.id,
  });
  revalidatePath("/overview");
  return error ? { error: error.message } : { ok: true };
}
