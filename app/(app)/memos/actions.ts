"use server";
import { requireProfile, requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function issueMemo(fd: FormData) {
  const profile = await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const issuedTo = String(fd.get("issued_to"));
  const { data, error } = await supabase.from("memos").insert({
    issued_by: profile.id,
    issued_to: issuedTo,
    reason: String(fd.get("reason")),
    body: (fd.get("body") as string) || null,
    acknowledgment_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  }).select("id").single();

  if (!error && data) {
    try {
      const admin = createAdminClient();
      await admin.from("notifications").insert({
        recipient_id: issuedTo,
        type: "memo_issued",
        title: "You received a memo",
        body: String(fd.get("reason")),
        link: `/memos/${data.id}`,
      });
    } catch { }
  }
  revalidatePath("/memos");
  return error ? { error: error.message } : { ok: true };
}

export async function acknowledgeMemo(id: string) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("memos").update({
    acknowledged_at: new Date().toISOString(), status: "acknowledged",
  }).eq("id", id).eq("issued_to", profile.id);
  revalidatePath(`/memos/${id}`);
  return error ? { error: error.message } : { ok: true };
}

export async function respondMemo(id: string, response: string) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("memos").update({
    employee_response: response, status: "responded",
  }).eq("id", id).eq("issued_to", profile.id);
  revalidatePath(`/memos/${id}`);
  return error ? { error: error.message } : { ok: true };
}

export async function decideMemo(id: string, decision: string) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const { error } = await supabase.from("memos").update({
    manager_decision: decision, status: "closed",
  }).eq("id", id);
  revalidatePath(`/memos/${id}`);
  return error ? { error: error.message } : { ok: true };
}
