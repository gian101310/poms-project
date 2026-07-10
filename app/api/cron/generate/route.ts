import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { todayStr, dow, epochDays } from "@/lib/tz";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Daily checklist generator — runs 00:05 Dubai time.
// For every scheduled employee: for each of their departments with an active
// template for their shift, snapshot the template into a checklist instance.

function taskDueToday(recurrence: any, dateStr: string): boolean {
  const r = recurrence ?? { type: "daily" };
  switch (r.type) {
    case "daily": return true;
    case "weekdays": return (r.days ?? []).includes(dow(dateStr));
    case "every_n_days": return r.n > 0 && epochDays(dateStr) % r.n === 0;
    case "monthly": return Number(dateStr.slice(8, 10)) === (r.day ?? 1);
    default: return true;
  }
}

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const today = todayStr();
  const summary = { date: today, employees: 0, instances: 0, tasks: 0, skipped: 0, errors: [] as string[] };

  // Holiday? Skip generation entirely.
  const { data: holiday } = await admin.from("holidays").select("id").eq("date", today).limit(1);
  if (holiday?.length) return NextResponse.json({ ...summary, note: "Holiday — no checklists generated." });

  const { data: schedules, error: schedErr } = await admin.from("employee_schedules")
    .select("profile_id, shift_id, profiles!inner(id, status, full_name)")
    .eq("work_date", today).eq("status", "scheduled").not("shift_id", "is", null);
  if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 500 });

  for (const sched of schedules ?? []) {
    const prof: any = (sched as any).profiles;
    if (prof.status !== "active") continue;
    summary.employees++;

    const { data: depts } = await admin.from("department_assignments")
      .select("department_id").eq("profile_id", sched.profile_id);

    for (const da of depts ?? []) {
      const { data: template } = await admin.from("checklist_templates")
        .select("id, version, template_tasks(*)")
        .eq("department_id", da.department_id).eq("shift_id", sched.shift_id)
        .eq("is_active", true).maybeSingle();
      if (!template) { summary.skipped++; continue; }

      // Skip if already generated (idempotent re-runs)
      const { data: existing } = await admin.from("checklist_instances")
        .select("id").eq("profile_id", sched.profile_id)
        .eq("template_id", template.id).eq("work_date", today).maybeSingle();
      if (existing) { summary.skipped++; continue; }

      const dueTasks = (template.template_tasks ?? []).filter((t: any) => taskDueToday(t.recurrence, today));
      if (!dueTasks.length) { summary.skipped++; continue; }

      const { data: inst, error: instErr } = await admin.from("checklist_instances").insert({
        profile_id: sched.profile_id,
        department_id: da.department_id,
        shift_id: sched.shift_id,
        template_id: template.id,
        template_version: template.version,
        work_date: today,
      }).select("id").single();
      if (instErr || !inst) { summary.errors.push(instErr?.message ?? "instance insert failed"); continue; }

      const { error: tasksErr } = await admin.from("checklist_tasks").insert(
        dueTasks.map((t: any) => ({
          instance_id: inst.id,
          template_task_id: t.id,
          title: t.title,
          description: t.description,
          sort_order: t.sort_order,
          priority: t.priority,
          tags: t.tags,
          requires_photo: t.requires_photo,
        }))
      );
      if (tasksErr) { summary.errors.push(tasksErr.message); continue; }

      summary.instances++;
      summary.tasks += dueTasks.length;

      await admin.from("notifications").insert({
        recipient_id: sched.profile_id,
        type: "checklist_ready",
        title: "Your checklist for today is ready",
        body: `${dueTasks.length} tasks`,
        link: "/checklist",
      });
    }
  }

  return NextResponse.json(summary);
}
