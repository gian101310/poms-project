"use server";
import { requireRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Send an urgent alert to all active staff or a single person.
// Writes one notification per recipient (shows in their bell + notifications page).
export async function sendBroadcast(fd: FormData) {
  const sender = await requireRole(["manager", "super_admin"]);
  const admin = createAdminClient();

  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  const target = String(fd.get("target") ?? "all"); // "all" | profile_id
  if (!title) return { error: "Title is required." };

  let recipients: string[] = [];
  if (target === "all") {
    const { data } = await admin.from("profiles").select("id").eq("status", "active").neq("role", "super_admin").neq("employee_code", "BOSSG");
    recipients = (data ?? []).map((p: any) => p.id);
  } else {
    recipients = [target];
  }
  if (recipients.length === 0) return { error: "No recipients found." };

  const rows = recipients.map((rid) => ({
    recipient_id: rid,
    type: "alert",
    title: `⚠ ${title}`,
    body: body || null,
    link: "/notifications",
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/broadcast");
  return { ok: true, count: recipients.length };
}
