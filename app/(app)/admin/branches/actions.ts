"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function codeFromName(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
}

export async function createBranch(fd: FormData) {
  const profile = await requireRole(["super_admin"]);
  const supabase = createClient();
  const name = String(fd.get("name") ?? "").trim();
  const code = String(fd.get("code") ?? "").trim().toUpperCase() || codeFromName(name);
  if (!name || !code) return { error: "Branch name and code are required." };

  const { data: branch, error } = await supabase.from("stores").insert({
    name,
    code,
    timezone: "Asia/Dubai",
  }).select("id").single();
  if (error || !branch) return { error: error?.message ?? "Could not create branch." };

  const { data: sourceDepts } = await supabase.from("departments")
    .select("id, name, code, icon, is_active, sections(name, code, sort_order, is_active)")
    .eq("store_id", profile.store_id)
    .eq("is_active", true);

  for (const d of sourceDepts ?? []) {
    const { data: newDept } = await supabase.from("departments").insert({
      store_id: branch.id,
      name: d.name,
      code: d.code,
      icon: d.icon,
      is_active: d.is_active,
    }).select("id").single();
    if (newDept && (d.sections ?? []).length) {
      await supabase.from("sections").insert((d.sections ?? []).map((s: any) => ({
        department_id: newDept.id,
        name: s.name,
        code: s.code,
        sort_order: s.sort_order,
        is_active: s.is_active,
      })));
    }
  }

  const { data: sourceShifts } = await supabase.from("shifts")
    .select("name, start_time, end_time, grace_minutes, is_active")
    .eq("store_id", profile.store_id);
  if ((sourceShifts ?? []).length) {
    await supabase.from("shifts").insert((sourceShifts ?? []).map((s: any) => ({
      store_id: branch.id,
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      grace_minutes: s.grace_minutes,
      is_active: s.is_active,
    })));
  }

  revalidatePath("/admin/branches");
  return { ok: true };
}

export async function updateBranch(id: string, fd: FormData) {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("stores").update({
    name: String(fd.get("name") ?? "").trim(),
    code: String(fd.get("code") ?? "").trim().toUpperCase(),
    is_active: fd.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/admin/branches");
  return error ? { error: error.message } : { ok: true };
}
