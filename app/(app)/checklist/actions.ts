"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// All writes go through the user's own RLS-scoped client:
// staff can only touch tasks on their own instances, and the DB
// trigger enforces valid transitions + writes task_events history.

export async function startTask(taskId: string) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("checklist_tasks").update({ status: "started" }).eq("id", taskId);
  revalidatePath("/checklist");
  return error ? { error: error.message } : { ok: true };
}

export async function completeTask(taskId: string) {
  await requireProfile();
  const supabase = createClient();
  const { data: task } = await supabase.from("checklist_tasks")
    .select("requires_photo, task_photos(id)").eq("id", taskId).single();
  if (task?.requires_photo && (task.task_photos ?? []).length === 0) {
    return { error: "This task requires a photo before completion." };
  }
  const { error } = await supabase.from("checklist_tasks").update({ status: "completed" }).eq("id", taskId);
  revalidatePath("/checklist");
  return error ? { error: error.message } : { ok: true };
}

export async function saveRemarks(taskId: string, remarks: string) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("checklist_tasks")
    .update({ employee_remarks: remarks }).eq("id", taskId);
  revalidatePath("/checklist");
  return error ? { error: error.message } : { ok: true };
}
