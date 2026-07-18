"use server";
import { requireRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ---------- DEPARTMENTS ----------
export async function createDepartment(fd: FormData) {
  const profile = await requireRole(["super_admin", "manager"]);
  const supabase = createAdminClient();
  const storeId = String(fd.get("store_id") ?? profile.store_id);
  const { error } = await supabase.from("departments").insert({
    store_id: storeId || profile.store_id,
    name: String(fd.get("name")),
    code: String(fd.get("code")).trim().toUpperCase(),
  });
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}

export async function updateDepartment(id: string, fd: FormData) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createAdminClient();
  const { error } = await supabase.from("departments").update({
    name: String(fd.get("name")),
    code: String(fd.get("code")).trim().toUpperCase(),
  }).eq("id", id);
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}

export async function toggleDepartment(id: string, isActive: boolean) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createAdminClient();
  const { error } = await supabase.from("departments").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}

// ---------- SECTIONS ----------
export async function createSection(departmentId: string, fd: FormData) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createAdminClient();
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const { error } = await supabase.from("sections").insert({
    department_id: departmentId,
    name: String(fd.get("name")).trim(),
    code: code || null,
    sort_order: Number(fd.get("sort_order") ?? 0) || 0,
  });
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}

export async function updateSection(id: string, fd: FormData) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createAdminClient();
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const { error } = await supabase.from("sections").update({
    name: String(fd.get("name")).trim(),
    code: code || null,
    sort_order: Number(fd.get("sort_order") ?? 0) || 0,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}

export async function toggleSection(id: string, isActive: boolean) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createAdminClient();
  const { error } = await supabase.from("sections").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}

export async function deleteSection(id: string) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createAdminClient();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  revalidatePath("/admin/departments");
  return error ? { error: error.message } : { ok: true };
}
