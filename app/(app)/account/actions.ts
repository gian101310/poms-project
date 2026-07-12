"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function changeOwnPassword(fd: FormData) {
  const profile = await requireProfile();
  const currentPassword = String(fd.get("current_password") ?? "");
  const newPassword = String(fd.get("new_password") ?? "");
  const confirmPassword = String(fd.get("confirm_password") ?? "");

  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "New passwords do not match." };
  if (currentPassword === newPassword) return { error: "Choose a new password that is different from the current one." };

  const supabase = createClient();
  const email = `${profile.employee_code.toUpperCase()}@poms.local`;
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { error: error.message } : { ok: true };
}
