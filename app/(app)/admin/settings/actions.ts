"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateSetting(id: string, rawJson: string) {
  await requireRole(["super_admin"]);
  let value: any;
  try { value = JSON.parse(rawJson); } catch {
    return { error: 'Value must be valid JSON — wrap text in quotes, e.g. "flag"' };
  }
  const supabase = createClient();
  const { data: setting } = await supabase.from("app_settings").select("key").eq("id", id).maybeSingle();
  const query = supabase.from("app_settings").update({ value });
  const { error } = setting?.key === "portal_name"
    ? await query.eq("key", "portal_name")
    : await query.eq("id", id);
  revalidatePath("/admin/settings");
  return error ? { error: error.message } : { ok: true };
}

async function requireSuperAdminActionPassword(fd: FormData) {
  const expected = process.env.SUPER_ADMIN_ACTION_PASSWORD;
  if (!expected) return "SUPER_ADMIN_ACTION_PASSWORD is not configured on the server.";
  if (String(fd.get("admin_password") ?? "") !== expected) return "Admin password is incorrect.";
  return null;
}

export async function setBooleanSetting(key: "project_enabled" | "task_scheduling_enabled", enabled: boolean, fd: FormData) {
  await requireRole(["super_admin"]);
  const passwordError = await requireSuperAdminActionPassword(fd);
  if (passwordError) return { error: passwordError };

  const supabase = createClient();
  const { error } = await supabase.from("app_settings").update({ value: enabled }).eq("key", key);
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return error ? { error: error.message } : { ok: true };
}

export async function resetGeneratedTasks(fd: FormData) {
  await requireRole(["super_admin"]);
  const passwordError = await requireSuperAdminActionPassword(fd);
  if (passwordError) return { error: passwordError };

  const from = String(fd.get("date_from") ?? "");
  const to = String(fd.get("date_to") ?? from);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { error: "Choose a valid date range." };
  }
  if (new Date(`${to}T00:00:00Z`) < new Date(`${from}T00:00:00Z`)) {
    return { error: "To date is before from date." };
  }

  const admin = createAdminClient();
  const { data: instances, error: readError } = await admin.from("checklist_instances")
    .select("id")
    .gte("work_date", from)
    .lte("work_date", to)
    .eq("status", "open");
  if (readError) return { error: readError.message };
  const ids = (instances ?? []).map((item: any) => item.id);
  if (!ids.length) return { ok: true, deleted: 0 };

  const { error: instanceError } = await admin.from("checklist_instances")
    .update({ status: "closed" })
    .in("id", ids);
  if (instanceError) return { error: instanceError.message };

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/checklist");
  revalidatePath("/overview");
  return { ok: true, deleted: ids.length };
}
