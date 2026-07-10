import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, Bar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [tasksRes, attRes, incRes, memoRes] = await Promise.all([
    supabase.from("checklist_tasks")
      .select("status, duration_minutes, is_overdue, checklist_instances!inner(profile_id, work_date)")
      .eq("checklist_instances.profile_id", profile.id)
      .gte("checklist_instances.work_date", since),
    supabase.from("attendance_records").select("status, late_minutes")
      .eq("profile_id", profile.id).gte("work_date", since),
    supabase.from("incident_reports").select("id", { count: "exact", head: true }).eq("reporter_id", profile.id),
    supabase.from("memos").select("id", { count: "exact", head: true }).eq("issued_to", profile.id),
  ]);

  const tasks = tasksRes.data ?? [];
  const total = tasks.length;
  const done = tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
  const verified = tasks.filter((t: any) => t.status === "verified").length;
  const overdue = tasks.filter((t: any) => t.is_overdue).length;
  const durations = tasks.filter((t: any) => t.duration_minutes != null).map((t: any) => t.duration_minutes);
  const avgDuration = durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;
  const completionPct = total ? Math.round((done / total) * 100) : 0;

  const att = attRes.data ?? [];
  const lateDays = att.filter((a: any) => a.status === "late").length;
  const absentDays = att.filter((a: any) => a.status === "absent").length;

  // Simple monthly rating out of 5
  const rating = Math.max(1, Math.round(
    (completionPct / 100) * 3 + (lateDays === 0 ? 1 : lateDays < 3 ? 0.5 : 0) + (overdue === 0 ? 1 : 0.5)
  ) );

  return (
    <div>
      <PageHeader title="My Performance" subtitle="Last 30 days" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Task Completion" value={`${completionPct}%`} hint={`${done}/${total} tasks`} />
        <StatCard label="Avg Task Time" value={`${avgDuration} min`} />
        <StatCard label="Verified Tasks" value={verified} />
        <StatCard label="Overdue Tasks" value={overdue} />
        <StatCard label="Late Days" value={lateDays} />
        <StatCard label="Absent Days" value={absentDays} />
        <StatCard label="My Incidents Reported" value={incRes.count ?? 0} />
        <StatCard label="Memos Received" value={memoRes.count ?? 0} />
      </div>

      <div className="card max-w-xl p-5">
        <p className="mb-1 text-sm font-medium">Monthly Rating</p>
        <p className="mb-3 text-3xl font-bold">{rating} <span className="text-base font-normal text-slate-400">/ 5</span></p>
        <Bar pct={(rating / 5) * 100} />
        <p className="mt-2 text-xs text-slate-400">Based on completion rate, punctuality, and overdue tasks.</p>
      </div>
    </div>
  );
}
