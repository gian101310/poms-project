"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function verifyTask(taskId: string, remarks: string) {
  const profile = await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const { error } = await supabase.from("checklist_tasks").update({
    status: "verified",
    supervisor_remarks: remarks || null,
    verified_by: profile.id,
  }).eq("id", taskId);
  revalidatePath("/verify");
  return error ? { error: error.message } : { ok: true };
}

export async function bounceTask(taskId: string, remarks: string) {
  await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const { error } = await supabase.from("checklist_tasks").update({
    status: "started",
    supervisor_remarks: remarks || "Please redo this task.",
  }).eq("id", taskId);
  revalidatePath("/verify");
  return error ? { error: error.message } : { ok: true };
}
