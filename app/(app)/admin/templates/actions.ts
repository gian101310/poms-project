"use server";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { defaultTasksFor } from "@/lib/default-checklists";
import { revalidatePath } from "next/cache";

export async function createTemplate(fd: FormData) {
  const profile = await requireRole(["super_admin"]);
  const supabase = createClient();
  const departmentId = String(fd.get("department_id"));
  const shiftId = String(fd.get("shift_id"));
  const prefill = String(fd.get("prefill") ?? "default"); // default | copy | blank

  // Version bump: deactivate existing active template for this dept+shift
  const { data: existing } = await supabase.from("checklist_templates")
    .select("id, version").eq("department_id", departmentId).eq("shift_id", shiftId)
    .eq("is_active", true).maybeSingle();

  let version = 1;
  if (existing) {
    await supabase.from("checklist_templates").update({ is_active: false }).eq("id", existing.id);
    version = existing.version + 1;
  }

  const { data: created, error } = await supabase.from("checklist_templates").insert({
    department_id: departmentId,
    shift_id: shiftId,
    name: String(fd.get("name")),
    version,
    created_by: profile.id,
  }).select("id").single();

  if (!error && created) {
    if (prefill === "copy" && existing) {
      // Copy tasks from the previous version so editing is incremental
      const { data: oldTasks } = await supabase.from("template_tasks").select("*").eq("template_id", existing.id);
      if (oldTasks?.length) {
        await supabase.from("template_tasks").insert(oldTasks.map((t: any) => ({
          template_id: created.id, title: t.title, description: t.description,
          sort_order: t.sort_order, priority: t.priority, tags: t.tags,
          requires_photo: t.requires_photo, estimated_minutes: t.estimated_minutes, recurrence: t.recurrence,
        })));
      }
    } else if (prefill === "default") {
      // Prefill from the department's default task library
      const { data: dept } = await supabase.from("departments").select("code").eq("id", departmentId).single();
      const defaults = defaultTasksFor(dept?.code ?? "");
      await supabase.from("template_tasks").insert(defaults.map((t, i) => ({
        template_id: created.id,
        title: t.title,
        description: t.description ?? null,
        sort_order: i,
        priority: t.priority ?? "normal",
        tags: t.tags ?? [],
        requires_photo: t.requires_photo ?? false,
        recurrence: { type: "daily" },
      })));
    }
    // prefill === "blank" → no tasks
  }
  revalidatePath("/admin/templates");
  return error ? { error: error.message } : { ok: true };
}

const RECURRENCE_MAP: Record<string, any> = {
  daily: { type: "daily" },
  mon: { type: "weekdays", days: [1] },
  fri: { type: "weekdays", days: [5] },
  every_3_days: { type: "every_n_days", n: 3 },
  monthly_1: { type: "monthly", day: 1 },
};

export async function addTemplateTask(templateId: string, fd: FormData) {
  await requireRole(["super_admin"]);
  const supabase = createClient();

  const { count } = await supabase.from("template_tasks")
    .select("id", { count: "exact", head: true }).eq("template_id", templateId);

  const { error } = await supabase.from("template_tasks").insert({
    template_id: templateId,
    title: String(fd.get("title")),
    description: (fd.get("description") as string) || null,
    sort_order: count ?? 0,
    priority: String(fd.get("priority") ?? "normal"),
    tags: fd.getAll("tags").map(String),
    requires_photo: fd.get("requires_photo") === "on",
    estimated_minutes: fd.get("estimated_minutes") ? Number(fd.get("estimated_minutes")) : null,
    recurrence: RECURRENCE_MAP[String(fd.get("recurrence_type") ?? "daily")] ?? { type: "daily" },
  });
  revalidatePath(`/admin/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function removeTemplateTask(taskId: string) {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("template_tasks").delete().eq("id", taskId);
  revalidatePath("/admin/templates");
  return error ? { error: error.message } : { ok: true };
}
