import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr, fmtTime } from "@/lib/tz";
import { PageHeader, StatCard, Badge, EmptyState, Bar } from "@/components/ui";
import { InlineVerify, FollowupButton } from "./overview-actions-ui";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: { date?: string } }) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const date = searchParams.date ?? todayStr();

  const [instRes, attRes, incRes, deptsRes, followRes, cashRes] = await Promise.all([
    supabase.from("checklist_instances")
      .select(`id, profile_id, department_id, status,
        departments(id, name), shifts(name),
        profiles!checklist_instances_profile_id_fkey(id, full_name, employee_code),
        checklist_tasks(id, title, status, priority, tags, is_overdue, employee_remarks, supervisor_remarks, completed_at, duration_minutes, blocked, blocked_reason)`)
      .eq("work_date", date),
    supabase.from("attendance_records").select("profile_id, status, late_minutes, flagged").eq("work_date", date),
    supabase.from("incident_reports").select("id", { count: "exact", head: true }).gte("created_at", date + "T00:00:00Z").lt("created_at", date + "T23:59:59Z"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
    supabase.from("followup_tasks").select("*, departments(name), profiles!followup_tasks_profile_id_fkey(full_name)")
      .is("consumed_at", null).order("target_date"),
    supabase.from("cash_reports").select("phase, opening_float, closing_float, cash_sales, card_sales, tips, expenses, created_at").eq("report_date", date),
  ]);

  const instances = (instRes.data ?? []) as any[];
  const attendance = attRes.data ?? [];
  const attMap = Object.fromEntries(attendance.map((a: any) => [a.profile_id, a]));

  const allTasks = instances.flatMap((i) => i.checklist_tasks ?? []);
  const done = allTasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
  const verified = allTasks.filter((t: any) => t.status === "verified").length;
  const overdue = allTasks.filter((t: any) => t.is_overdue).length;
  const blocked = allTasks.filter((t: any) => t.blocked).length;
  const onTime = allTasks.filter((t: any) => ["completed", "verified"].includes(t.status) && !t.is_overdue).length;
  const cashReports = (cashRes.data ?? []) as any[];
  const cashTotals = cashReports.reduce((acc, r) => ({
    cash_sales: acc.cash_sales + Number(r.cash_sales ?? 0),
    card_sales: acc.card_sales + Number(r.card_sales ?? 0),
    tips: acc.tips + Number(r.tips ?? 0),
    expenses: acc.expenses + Number(r.expenses ?? 0),
  }), { cash_sales: 0, card_sales: 0, tips: 0, expenses: 0 });
  const money = (value: number) => `AED ${value.toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;

  const kpi = {
    completion: allTasks.length ? Math.round((done / allTasks.length) * 100) : 0,
    verifiedPct: done ? Math.round((verified / done) * 100) : 0,
    onTimePct: allTasks.length ? Math.round((onTime / allTasks.length) * 100) : 0,
  };

  // group instances by department
  const byDept = new Map<string, { name: string; instances: any[] }>();
  for (const d of deptsRes.data ?? []) byDept.set(d.id, { name: d.name, instances: [] });
  for (const inst of instances) {
    const entry = byDept.get(inst.department_id) ?? { name: inst.departments?.name ?? "?", instances: [] };
    entry.instances.push(inst);
    byDept.set(inst.department_id, entry);
  }

  const pendingFollowups = (followRes.data ?? []) as any[];

  return (
    <div>
      <div className="sticky top-[57px] z-20 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 pb-3 pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:-mx-6 md:px-6">
        <PageHeader title="Command Center" subtitle={`Every department, every employee — ${date}`}
          action={
            <form className="flex gap-2">
              <input type="date" name="date" defaultValue={date} className="input !w-auto" />
              <button className="btn-secondary">Go</button>
            </form>
          } />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
          <StatCard label="Completion" value={`${kpi.completion}%`} hint={`${done}/${allTasks.length} tasks`} />
          <StatCard label="On-Time" value={`${kpi.onTimePct}%`} />
          <StatCard label="Verified" value={`${kpi.verifiedPct}%`} hint="of completed" />
          <StatCard label="Overdue" value={overdue} />
          <StatCard label="Blocked" value={blocked} />
          <StatCard label="Present / Late" value={`${attendance.filter((a: any) => a.status === "present").length} / ${attendance.filter((a: any) => a.status === "late").length}`} />
          <StatCard label="Absent" value={attendance.filter((a: any) => a.status === "absent").length} />
          <StatCard label="Incidents" value={incRes.count ?? 0} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Cash Drop" value={money(cashTotals.cash_sales)} hint={`${cashReports.length} report(s)`} />
        <StatCard label="Card Sales" value={money(cashTotals.card_sales)} />
        <StatCard label="Tips" value={money(cashTotals.tips)} />
        <StatCard label="Expenses" value={money(cashTotals.expenses)} />
      </div>

      {pendingFollowups.length > 0 && (
        <div className="card mb-6 border-l-4 border-l-amber-500 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Queued follow-ups (added to future checklists)</p>
          <ul className="space-y-1 text-sm">
            {pendingFollowups.map((f) => (
              <li key={f.id}>
                <span className="font-medium">{f.target_date}</span> · {f.departments?.name}
                {f.profiles?.full_name ? ` · ${f.profiles.full_name}` : " · whole department"} — {f.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {instances.length === 0 && <EmptyState message={`No checklists for ${date}.`} />}

      {Array.from(byDept.entries()).filter(([, d]) => d.instances.length > 0).map(([deptId, dept]) => (
        <section key={deptId} className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{dept.name}</h2>
            <FollowupButton departmentId={deptId} departmentName={dept.name} />
          </div>
          <div className="space-y-3">
            {dept.instances.map((inst: any) => {
              const tasks = (inst.checklist_tasks ?? []).sort((a: any, b: any) => a.title.localeCompare(b.title));
              const d = tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
              const pct = tasks.length ? Math.round((d / tasks.length) * 100) : 0;
              const att = attMap[inst.profile_id];
              const withRemarks = tasks.filter((t: any) => t.employee_remarks);
              const blockedTasks = tasks.filter((t: any) => t.blocked);
              return (
                <details key={inst.id} className="card group p-0">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {inst.profiles?.full_name}
                        <span className="ml-1 text-xs text-slate-400">({inst.profiles?.employee_code}) · {inst.shifts?.name}</span>
                        {att?.flagged && <span className="ml-2 text-xs text-red-500">⚠ off-site</span>}
                        {att?.status === "late" && <span className="ml-2 text-xs text-amber-500">late {att.late_minutes}m</span>}
                      </p>
                      <div className="mt-1.5 max-w-md"><Bar pct={pct} color={pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"} /></div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{d}/{tasks.length}</span>
                      {blockedTasks.length > 0 && <span className="text-xs font-medium text-red-500">{blockedTasks.length} blocked</span>}
                      {withRemarks.length > 0 && <span className="text-xs text-blue-500">{withRemarks.length} note(s)</span>}
                      <FollowupButton departmentId={deptId} departmentName={dept.name}
                        profileId={inst.profile_id} profileName={inst.profiles?.full_name} small />
                    </div>
                  </summary>
                  <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                    {tasks.map((t: any) => (
                      <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{t.title}
                            {t.is_overdue && <span className="ml-2 text-xs text-red-500">overdue</span>}
                            {t.blocked && <span className="ml-2 text-xs font-medium text-red-500">can't complete</span>}
                          </p>
                          {t.blocked_reason && <p className="text-xs font-medium text-red-600 dark:text-red-300">Reason: {t.blocked_reason}</p>}
                          {t.employee_remarks && <p className="text-xs text-blue-600 dark:text-blue-400">💬 {t.employee_remarks}</p>}
                          {t.supervisor_remarks && <p className="text-xs text-slate-400">Sup: {t.supervisor_remarks}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {t.completed_at && <span className="text-xs text-slate-400">{fmtTime(t.completed_at)}{t.duration_minutes != null ? ` · ${t.duration_minutes}m` : ""}</span>}
                          <Badge value={t.status} />
                          {t.status === "completed" && <InlineVerify taskId={t.id} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
