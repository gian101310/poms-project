"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSetting(id: string, rawJson: string) {
  await requireRole(["super_admin"]);
  let value: any;
  try { value = JSON.parse(rawJson); } catch {
    return { error: 'Value must be valid JSON — wrap text in quotes, e.g. "flag"' };
  }
  const supabase = createClient();
  const { error } = await supabase.from("app_settings").update({ value }).eq("id", id);
  revalidatePath("/admin/settings");
  return error ? { error: error.message } : { ok: true };
}
