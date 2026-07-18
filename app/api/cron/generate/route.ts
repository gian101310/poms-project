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

  const { data: schedulingSetting } = await admin.from("app_settings")
    .select("value")
    .eq("key", "task_scheduling_enabled")
    .limit(1)
    .maybeSingle();
  if (schedulingSetting?.value !== true) {
    return NextResponse.json({ ...summary, note: "Automatic task scheduling is turned off." });
  }

  // Holiday? Skip generation entirely.
  const { data: holiday } = await admin.from("holidays").select("id").eq("date", today).limit(1);
  if (holiday?.length) return NextResponse.json({ ...summary, note: "Holiday — no checklists generated." });

  // Follow-up tasks queued by management for today
  const { data: followups } = await admin.from("followup_tasks")
    .select("*").eq("target_date", today).is("consumed_at", null);
  const consumedFollowups = new Set<string>();

  const { data: schedules, error: schedErr } = await admin.from("employee_schedules")
    .select("profile_id, shift_id, profiles!employee_schedules_profile_id_fkey!inner(id, status, full_name)")
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

      // Management follow-ups for this department (and this person, if targeted)
      const myFollowups = (followups ?? []).filter((f: any) =>
        f.department_id === da.department_id &&
        (f.profile_id === null || f.profile_id === sched.profile_id)
      );

      const taskRows = [
        ...dueTasks.map((t: any) => ({
          instance_id: inst.id,
          template_task_id: t.id,
          title: t.title,
          description: t.description,
          sort_order: t.sort_order,
          priority: t.priority,
          tags: t.tags,
          requires_photo: t.requires_photo,
        })),
        ...myFollowups.map((f: any, i: number) => ({
          instance_id: inst.id,
          title: f.title,
          description: f.note,
          sort_order: 900 + i,
          priority: f.priority,
          tags: ["followup"],
          requires_photo: false,
        })),
      ];

      const { error: tasksErr } = await admin.from("checklist_tasks").insert(taskRows);
      if (tasksErr) { summary.errors.push(tasksErr.message); continue; }
      for (const f of myFollowups) consumedFollowups.add(f.id);

      summary.instances++;
      summary.tasks += taskRows.length;

      await admin.from("notifications").insert({
        recipient_id: sched.profile_id,
        type: "checklist_ready",
        title: "Your checklist for today is ready",
        body: `${dueTasks.length} tasks`,
        link: "/checklist",
      });
    }
  }

  // Mark delivered follow-ups so they don't repeat tomorrow
  if (consumedFollowups.size > 0) {
    await admin.from("followup_tasks")
      .update({ consumed_at: new Date().toISOString() })
      .in("id", Array.from(consumedFollowups));
  }

  return NextResponse.json(summary);
}
