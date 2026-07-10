import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { todayStr } from "@/lib/tz";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Orchestrator — end-of-day report. Runs 22:15 Dubai, after the overdue sweep.
// The orchestrator's day: generate cron prepares checklists (00:05) →
// overdue cron watches progress (22:05) → this job summarizes everything
// and delivers the report to managers.

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const today = todayStr();

  const [instRes, attRes, incRes, hoRes, welfareRes] = await Promise.all([
    admin.from("checklist_instances")
      .select("id, profile_id, departments(name), profiles!checklist_instances_profile_id_fkey(full_name, employee_code), checklist_tasks(status, is_overdue)")
      .eq("work_date", today),
    admin.from("attendance_records")
      .select("status, late_minutes, worked_minutes, overtime_minutes, flagged, profiles(full_name)")
      .eq("work_date", today),
    admin.from("incident_reports").select("category, status, created_at")
      .gte("created_at", today + "T00:00:00Z"),
    admin.from("shift_handovers")
      .select("status, profiles!shift_handovers_profile_id_fkey(full_name)")
      .eq("work_date", today),
    admin.from("welfare_records").select("record_type").gte("recorded_at", today + "T00:00:00Z"),
  ]);

  const instances = instRes.data ?? [];
  const allTasks = instances.flatMap((i: any) => i.checklist_tasks ?? []);
  const done = allTasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
  const verified = allTasks.filter((t: any) => t.status === "verified").length;
  const overdue = allTasks.filter((t: any) => t.is_overdue).length;

  // Per-department rollup
  const byDept: Record<string, { total: number; done: number }> = {};
  for (const inst of instances as any[]) {
    const name = inst.departments?.name ?? "Unknown";
    byDept[name] ??= { total: 0, done: 0 };
    const tasks = inst.checklist_tasks ?? [];
    byDept[name].total += tasks.length;
    byDept[name].done += tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
  }

  // Employees who left tasks unfinished
  const laggards = (instances as any[])
    .map((i) => ({
      name: i.profiles?.full_name,
      code: i.profiles?.employee_code,
      pending: (i.checklist_tasks ?? []).filter((t: any) => ["pending", "started"].includes(t.status)).length,
    }))
    .filter((x) => x.pending > 0);

  const att = attRes.data ?? [];
  const incidents = incRes.data ?? [];
  const handovers = hoRes.data ?? [];
  const welfare = welfareRes.data ?? [];

  const content = {
    date: today,
    tasks: {
      total: allTasks.length, completed: done, verified, overdue,
      completion_pct: allTasks.length ? Math.round((done / allTasks.length) * 100) : null,
    },
    departments: Object.entries(byDept).map(([name, v]) => ({
      name, total: v.total, done: v.done,
      pct: v.total ? Math.round((v.done / v.total) * 100) : 0,
    })).sort((a, b) => a.pct - b.pct),
    unfinished_by: laggards,
    attendance: {
      present: att.filter((a: any) => a.status === "present").length,
      late: att.filter((a: any) => a.status === "late").length,
      absent: att.filter((a: any) => a.status === "absent").length,
      on_leave: att.filter((a: any) => a.status === "on_leave").length,
      flagged_clockins: att.filter((a: any) => a.flagged).map((a: any) => a.profiles?.full_name),
      total_overtime_minutes: att.reduce((s: number, a: any) => s + (a.overtime_minutes ?? 0), 0),
    },
    incidents: {
      new_today: incidents.length,
      by_category: incidents.reduce((acc: Record<string, number>, i: any) => {
        acc[i.category] = (acc[i.category] ?? 0) + 1; return acc;
      }, {}),
    },
    handovers: {
      submitted: handovers.filter((h: any) => h.status !== "draft").length,
      approved: handovers.filter((h: any) => h.status === "approved").length,
      still_draft: handovers.filter((h: any) => h.status === "draft").map((h: any) => h.profiles?.full_name),
    },
    welfare_records_today: welfare.length,
    highlights: [] as string[],
  };

  // Plain-language highlights
  if (content.tasks.completion_pct != null && content.tasks.completion_pct < 80) {
    content.highlights.push(`Task completion was ${content.tasks.completion_pct}% — below the 80% target.`);
  }
  if (overdue > 0) content.highlights.push(`${overdue} task(s) ended the day overdue.`);
  if (content.attendance.absent > 0) content.highlights.push(`${content.attendance.absent} absence(s) today.`);
  if (content.attendance.flagged_clockins.length > 0) {
    content.highlights.push(`Flagged clock-ins to review: ${content.attendance.flagged_clockins.join(", ")}.`);
  }
  if (content.incidents.new_today > 0) content.highlights.push(`${content.incidents.new_today} new incident(s) reported.`);
  if (content.departments[0] && content.departments[0].pct < 100 && content.departments[0].total > 0) {
    content.highlights.push(`Weakest department: ${content.departments[0].name} at ${content.departments[0].pct}%.`);
  }
  if (content.highlights.length === 0) content.highlights.push("Clean day — all departments on track.");

  const { data: store } = await admin.from("stores").select("id").limit(1).single();
  const { error } = await admin.from("daily_reports").upsert({
    store_id: store?.id, report_date: today, content,
  }, { onConflict: "report_date" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deliver to managers + admins
  const { data: managers } = await admin.from("profiles")
    .select("id").in("role", ["manager", "super_admin"]).eq("status", "active");
  if (managers?.length) {
    await admin.from("notifications").insert(managers.map((m) => ({
      recipient_id: m.id,
      type: "eod_report",
      title: `End-of-day report — ${today}`,
      body: content.highlights[0],
      link: "/reports",
    })));
  }

  return NextResponse.json({ ok: true, date: today, highlights: content.highlights });
}
