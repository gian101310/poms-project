"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDepartment(fd: FormData) {
  const profile = await requireRole(["super_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("departments").insert({
    store_id: profile.store_id,
    name: String(fd.get("name")),
    code: String(fd.get("code")).trim().toUpperCase(),
  });
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}

export async function toggleDepartment(id: string, isActive: boolean) {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("departments").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}
