import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, Bar, EmptyState, Table } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: { branch?: string } }) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const selectedBranch = searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : null;

  let tasksQuery = supabase.from("checklist_tasks")
    .select("status, is_overdue, checklist_instances!inner(work_date, department_id, profile_id, departments!inner(name, store_id), profiles(full_name, employee_code))")
    .gte("checklist_instances.work_date", since).limit(5000);
  let incQuery = selectedBranch
    ? supabase.from("incident_reports").select("status, category, created_at, departments!inner(store_id)").eq("departments.store_id", selectedBranch)
    : supabase.from("incident_reports").select("status, category, created_at");
  incQuery = incQuery.gte("created_at", since + "T00:00:00Z");
  let inspQuery = supabase.from("inspections").select("total_score, max_score, departments!inner(name, store_id)").gte("work_date", since);
  let attQuery = supabase.from("attendance_records").select("status, profiles!inner(store_id)").gte("work_date", since);
  let welfareQuery = supabase.from("welfare_records").select("id, animals!inner(store_id)", { count: "exact", head: true }).gte("recorded_at", since + "T00:00:00Z");
  if (selectedBranch) {
    tasksQuery = tasksQuery.eq("checklist_instances.departments.store_id", selectedBranch);
    inspQuery = inspQuery.eq("departments.store_id", selectedBranch);
    attQuery = attQuery.eq("profiles.store_id", selectedBranch);
    welfareQuery = welfareQuery.eq("animals.store_id", selectedBranch);
  }

  const [branchesRes, tasksRes, incRes, inspRes, attRes, welfareRes] = await Promise.all([
    supabase.from("stores").select("id, name, code").eq("is_active", true).order("name"),
    tasksQuery,
    incQuery,
    inspQuery,
    attQuery,
    welfareQuery,
  ]);

  const tasks = tasksRes.data ?? [];
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
  const overdueTasks = tasks.filter((t: any) => t.is_overdue).length;
  const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Department performance
  const byDept: Record<string, { total: number; done: number }> = {};
  for (const t of tasks as any[]) {
    const name = t.checklist_instances?.departments?.name ?? "Unknown";
    byDept[name] ??= { total: 0, done: 0 };
    byDept[name].total++;
    if (["completed", "verified"].includes(t.status)) byDept[name].done++;
  }

  // Employee ranking
  const byEmp: Record<string, { name: string; total: number; done: number }> = {};
  for (const t of tasks as any[]) {
    const p = t.checklist_instances?.profiles;
    if (!p) continue;
    const key = p.employee_code;
    byEmp[key] ??= { name: p.full_name, total: 0, done: 0 };
    byEmp[key].total++;
    if (["completed", "verified"].includes(t.status)) byEmp[key].done++;
  }
  const ranking = Object.entries(byEmp)
    .map(([code, v]) => ({ code, ...v, pct: v.total ? Math.round((v.done / v.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct).slice(0, 15);

  const incidents = incRes.data ?? [];
  const openIncidents = incidents.filter((i: any) => ["open", "investigating"].includes(i.status)).length;
  const inspections = inspRes.data ?? [];
  const avgInspection = inspections.length
    ? Math.round(inspections.reduce((s: number, i: any) => s + (i.max_score ? (i.total_score / i.max_score) * 100 : 0), 0) / inspections.length)
    : null;
  const att = attRes.data ?? [];
  const lateDays = att.filter((a: any) => a.status === "late").length;
  const absentDays = att.filter((a: any) => a.status === "absent").length;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Last 30 days" action={<BranchFilter branches={branchesRes.data ?? []} selected={selectedBranch ?? "all"} />} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Task Completion" value={`${completionPct}%`} hint={`${doneTasks}/${totalTasks}`} />
        <StatCard label="Overdue Tasks" value={overdueTasks} />
        <StatCard label="Open Incidents" value={openIncidents} hint={`${incidents.length} total`} />
        <StatCard label="Avg Inspection Score" value={avgInspection != null ? `${avgInspection}%` : "—"} hint={`${inspections.length} inspections`} />
        <StatCard label="Late Days" value={lateDays} />
        <StatCard label="Absences" value={absentDays} />
        <StatCard label="Welfare Records" value={welfareRes.count ?? 0} />
        <StatCard label="Active Depts" value={Object.keys(byDept).length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Department Performance</h2>
          {Object.keys(byDept).length === 0 ? <EmptyState message="No task data yet." /> : (
            <div className="card space-y-3 p-4">
              {Object.entries(byDept).sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total)).map(([name, v]) => {
                const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-slate-500">{pct}% ({v.done}/{v.total})</span>
                    </div>
                    <Bar pct={pct} color={pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Employee Ranking</h2>
          {ranking.length === 0 ? <EmptyState message="No employee data yet." /> : (
            <Table headers={["#", "Employee", "Done", "Rate"]}>
              {ranking.map((r, i) => (
                <tr key={r.code} className="table-row">
                  <td className="td font-bold">{i + 1}</td>
                  <td className="td">{r.name} <span className="text-xs text-slate-400">({r.code})</span></td>
                  <td className="td">{r.done}/{r.total}</td>
                  <td className="td font-semibold">{r.pct}%</td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>

      {incidents.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Incidents by Category</h2>
          <div className="card space-y-2 p-4">
            {Object.entries(incidents.reduce((acc: Record<string, number>, i: any) => {
              acc[i.category] = (acc[i.category] ?? 0) + 1; return acc;
            }, {})).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-36 text-sm capitalize">{cat.replace(/_/g, " ")}</span>
                <div className="flex-1"><Bar pct={(n / incidents.length) * 100} color="bg-red-400" /></div>
                <span className="w-8 text-right text-sm font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
