"use server";
import { requireProfile, requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createIncident(fd: FormData) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { data, error } = await supabase.from("incident_reports").insert({
    reporter_id: profile.id,
    department_id: (fd.get("department_id") as string) || null,
    category: String(fd.get("category")),
    description: String(fd.get("description")),
    root_cause: (fd.get("root_cause") as string) || null,
    corrective_action: (fd.get("corrective_action") as string) || null,
    occurred_at: (fd.get("occurred_at") as string) ? new Date(String(fd.get("occurred_at"))).toISOString() : null,
  }).select("id").single();

  // Notify managers (service role — notifications are server-created)
  if (!error && data) {
    try {
      const admin = createAdminClient();
      const { data: managers } = await admin.from("profiles")
        .select("id").in("role", ["manager", "super_admin"]).eq("status", "active");
      if (managers?.length) {
        await admin.from("notifications").insert(managers.map((m) => ({
          recipient_id: m.id,
          type: "incident_submitted",
          title: "New incident report",
          body: `${profile.full_name}: ${String(fd.get("category")).replace(/_/g, " ")}`,
          link: `/incidents/${data.id}`,
        })));
      }
    } catch { /* notifications are best-effort */ }
  }
  revalidatePath("/incidents");
  return error ? { error: error.message } : { ok: true };
}

export async function reviewIncident(id: string, status: string, comments: string, decision: string) {
  await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const patch: any = { status };
  if (comments) patch.supervisor_comments = comments;
  if (decision) patch.management_decision = decision;
  const { error } = await supabase.from("incident_reports").update(patch).eq("id", id);
  revalidatePath(`/incidents/${id}`);
  revalidatePath("/incidents");
  return error ? { error: error.message } : { ok: true };
}
