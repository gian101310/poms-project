import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, Bar, EmptyState, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: { date?: string } }) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();

  const { data: reports } = await supabase.from("daily_reports")
    .select("report_date").order("report_date", { ascending: false }).limit(30);

  const selectedDate = searchParams.date ?? reports?.[0]?.report_date;
  const { data: report } = selectedDate
    ? await supabase.from("daily_reports").select("*").eq("report_date", selectedDate).maybeSingle()
    : { data: null };

  const c: any = report?.content;

  return (
    <div>
      <PageHeader title="Daily Reports" subtitle="Delivered by the orchestrator at 22:15 each night" />

      {(reports ?? []).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {(reports ?? []).map((r: any) => (
            <a key={r.report_date} href={`/reports?date=${r.report_date}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${r.report_date === selectedDate
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}>
              {fmtDate(r.report_date)}
            </a>
          ))}
        </div>
      )}

      {!c ? (
        <EmptyState message="No reports yet. The first report is delivered automatically at 22:15 tonight." />
      ) : (
        <div className="space-y-6">
          <div className="card border-l-4 border-l-brand-500 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Highlights</p>
            <ul className="space-y-1">
              {(c.highlights ?? []).map((h: string, i: number) => (
                <li key={i} className="text-sm">• {h}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Task Completion" value={c.tasks?.completion_pct != null ? `${c.tasks.completion_pct}%` : "—"}
              hint={`${c.tasks?.completed ?? 0}/${c.tasks?.total ?? 0} tasks`} />
            <StatCard label="Verified" value={c.tasks?.verified ?? 0} />
            <StatCard label="Overdue" value={c.tasks?.overdue ?? 0} />
            <StatCard label="Welfare Records" value={c.welfare_records_today ?? 0} />
            <StatCard label="Present / Late" value={`${c.attendance?.present ?? 0} / ${c.attendance?.late ?? 0}`} />
            <StatCard label="Absent" value={c.attendance?.absent ?? 0} />
            <StatCard label="Overtime Total" value={`${Math.round((c.attendance?.total_overtime_minutes ?? 0) / 60 * 10) / 10}h`} />
            <StatCard label="New Incidents" value={c.incidents?.new_today ?? 0} />
          </div>

          {(c.departments ?? []).length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Departments</h2>
              <div className="card space-y-3 p-4">
                {c.departments.map((d: any) => (
                  <div key={d.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-slate-500">{d.pct}% ({d.done}/{d.total})</span>
                    </div>
                    <Bar pct={d.pct} color={d.pct >= 80 ? "bg-green-500" : d.pct >= 50 ? "bg-amber-500" : "bg-red-500"} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {(c.unfinished_by ?? []).length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Unfinished Tasks</h2>
                <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
                  {c.unfinished_by.map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm">{u.name} <span className="text-xs text-slate-400">({u.code})</span></span>
                      <Badge value="pending" />
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Handovers</h2>
              <div className="card p-4 text-sm">
                <p>{c.handovers?.submitted ?? 0} submitted · {c.handovers?.approved ?? 0} approved</p>
                {(c.handovers?.still_draft ?? []).length > 0 && (
                  <p className="mt-2 text-amber-600">Not submitted: {c.handovers.still_draft.join(", ")}</p>
                )}
                {(c.attendance?.flagged_clockins ?? []).length > 0 && (
                  <p className="mt-2 text-red-600">⚠ Off-site clock-ins: {c.attendance.flagged_clockins.join(", ")}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
