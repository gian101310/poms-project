"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
