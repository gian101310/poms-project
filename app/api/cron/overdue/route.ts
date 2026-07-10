import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { todayStr, nowTimeStr } from "@/lib/tz";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Overdue sweep — runs every 30 minutes during store hours.
// Marks unfinished tasks overdue once the shift has ended, and notifies
// the employee + their department supervisors (once per instance).

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const today = todayStr();
  const nowMin = toMin(nowTimeStr());
  const summary = { date: today, overdueMarked: 0, notified: 0 };

  const { data: instances } = await admin.from("checklist_instances")
    .select("id, profile_id, department_id, shifts(end_time), checklist_tasks(id, status, is_overdue)")
    .eq("work_date", today).eq("status", "open");

  for (const inst of instances ?? []) {
    const shift: any = (inst as any).shifts;
    if (!shift?.end_time) continue;
    if (nowMin < toMin(shift.end_time)) continue; // shift not over yet

    const unfinished = ((inst as any).checklist_tasks ?? [])
      .filter((t: any) => ["pending", "started"].includes(t.status) && !t.is_overdue);
    if (!unfinished.length) continue;

    const { error } = await admin.from("checklist_tasks")
      .update({ is_overdue: true })
      .in("id", unfinished.map((t: any) => t.id));
    if (error) continue;
    summary.overdueMarked += unfinished.length;

    // Notify employee + supervisors
    const recipients = new Set<string>([inst.profile_id]);
    const { data: sups } = await admin.from("department_assignments")
      .select("profile_id").eq("department_id", inst.department_id)
      .or("is_primary_supervisor.eq.true,is_backup_supervisor.eq.true");
    for (const s of sups ?? []) recipients.add(s.profile_id);

    await admin.from("notifications").insert(Array.from(recipients).map((r) => ({
      recipient_id: r,
      type: "task_overdue",
      title: "Overdue tasks",
      body: `${unfinished.length} unfinished task(s) after shift end`,
      link: r === inst.profile_id ? "/checklist" : "/verify",
    })));
    summary.notified += recipients.size;
  }

  return NextResponse.json(summary);
}
