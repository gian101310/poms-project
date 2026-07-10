"use server";
import { requireProfile, requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/tz";
import { revalidatePath } from "next/cache";

export async function saveHandover(form: Record<string, string>, asDraft: boolean) {
  const profile = await requireProfile();
  const supabase = createClient();
  const today = todayStr();
  const { department_id, shift_id, ...fields } = form;
  if (!department_id || !shift_id) return { error: "No department/shift found for today." };

  const payload: any = {
    ...fields,
    profile_id: profile.id,
    department_id,
    shift_id,
    work_date: today,
    status: asDraft ? "draft" : "submitted",
    submitted_at: asDraft ? null : new Date().toISOString(),
  };

  const { data: existing } = await supabase.from("shift_handovers")
    .select("id, status").eq("profile_id", profile.id).eq("work_date", today).maybeSingle();

  let error;
  if (existing) {
    if (existing.status !== "draft") return { error: "Handover already submitted." };
    ({ error } = await supabase.from("shift_handovers").update(payload).eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("shift_handovers").insert(payload));
  }
  revalidatePath("/handover");
  return error ? { error: error.message } : { ok: true };
}

export async function approveHandover(id: string) {
  const profile = await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const { error } = await supabase.from("shift_handovers").update({
    status: "approved", approved_by: profile.id, approved_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "submitted");
  revalidatePath("/handover");
  return error ? { error: error.message } : { ok: true };
}

export async function acknowledgeHandover(id: string) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("shift_handovers").update({
    acknowledged_by: profile.id, acknowledged_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/handover");
  return error ? { error: error.message } : { ok: true };
}
