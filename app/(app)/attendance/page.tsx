import { requireProfile, isSupervisorUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table, StatCard } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";
import { fmtDate, fmtTime, todayStr } from "@/lib/tz";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const hm = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

export default async function AttendancePage({ searchParams }: { searchParams: { branch?: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const selectedBranch = searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : null;

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let query = supabase.from("attendance_records")
    .select("*, profiles!inner(full_name, employee_code, store_id)")
    .gte("work_date", since)
    .order("work_date", { ascending: false });
  if (selectedBranch && isSupervisorUp(profile.role)) query = query.eq("profiles.store_id", selectedBranch);

  const { data: records } = isSupervisorUp(profile.role)
    ? await query.limit(300)
    : await query.eq("profile_id", profile.id);
  let breakQuery = supabase.from("break_sessions").select("profile_id, work_date, duration_minutes, flagged, store_id").gte("work_date", since);
  if (selectedBranch && isSupervisorUp(profile.role)) breakQuery = breakQuery.eq("store_id", selectedBranch);
  const { data: breaks } = isSupervisorUp(profile.role)
    ? await breakQuery.limit(1000)
    : await supabase.from("break_sessions").select("profile_id, work_date, duration_minutes, flagged").eq("profile_id", profile.id).gte("work_date", since);
  const { data: branches } = isSupervisorUp(profile.role)
    ? await supabase.from("stores").select("id, name, code").eq("is_active", true).order("name")
    : { data: [] };
  const breakMap = new Map<string, { total: number; flagged: number }>();
  for (const b of breaks ?? []) {
    const key = `${b.profile_id}:${b.work_date}`;
    const entry = breakMap.get(key) ?? { total: 0, flagged: 0 };
    entry.total += b.duration_minutes ?? 0;
    entry.flagged += b.flagged ? 1 : 0;
    breakMap.set(key, entry);
  }

  const mine = (records ?? []).filter((r: any) => r.profile_id === profile.id);

  // This week (Mon–Sun) summary for the logged-in employee
  const today = new Date(todayStr() + "T00:00:00Z");
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const mondayStr = monday.toISOString().slice(0, 10);
  const thisWeek = mine.filter((r: any) => r.work_date >= mondayStr);

  const wWorked = thisWeek.reduce((s: number, r: any) => s + (r.worked_minutes ?? 0), 0);
  const wLate = thisWeek.reduce((s: number, r: any) => s + (r.late_minutes ?? 0), 0);
  const wOT = thisWeek.reduce((s: number, r: any) => s + (r.overtime_minutes ?? 0), 0);
  const wNet = Math.max(0, wWorked - wLate);

  const mWorked = mine.reduce((s: number, r: any) => s + (r.worked_minutes ?? 0), 0);
  const mLate = mine.reduce((s: number, r: any) => s + (r.late_minutes ?? 0), 0);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="This week + last 30 days"
        action={isSupervisorUp(profile.role) ? <BranchFilter branches={branches ?? []} selected={selectedBranch ?? "all"} /> : null} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Worked This Week" value={hm(wWorked)} hint={`${thisWeek.length} day(s)`} />
        <StatCard label="Late This Week" value={hm(wLate)} />
        <StatCard label="Net Payable (wk)" value={hm(wNet)} hint="worked − late" />
        <StatCard label="Overtime (wk)" value={hm(wOT)} />
        <StatCard label="Worked 30 Days" value={hm(mWorked)} />
        <StatCard label="Late 30 Days" value={hm(mLate)} />
        <StatCard label="Net 30 Days" value={hm(Math.max(0, mWorked - mLate))} />
        <StatCard label="Absences 30 Days" value={mine.filter((r: any) => r.status === "absent").length} />
      </div>

      {(!records || records.length === 0) ? (
        <EmptyState message="No attendance records yet." />
      ) : (
        <Table headers={isSupervisorUp(profile.role)
          ? ["Date", "Employee", "Shift", "In", "Out", "Worked", "Break", "Late", "OT", "Status", ""]
          : ["Date", "Shift", "In", "Out", "Worked", "Break", "Late", "OT", "Status", ""]}>
          {records.map((r: any) => {
            const br = breakMap.get(`${r.profile_id}:${r.work_date}`);
            return (
              <tr key={r.id} className="table-row">
                <td className="td">{fmtDate(r.work_date)}</td>
                {isSupervisorUp(profile.role) && <td className="td">{r.profiles?.full_name}</td>}
                <td className="td text-xs">{r.shift_snapshot?.name ?? "—"}</td>
                <td className="td">{r.clock_in ? fmtTime(r.clock_in) : "—"}</td>
                <td className="td">{r.clock_out ? fmtTime(r.clock_out) : "—"}</td>
                <td className="td font-medium">{r.worked_minutes ? hm(r.worked_minutes) : "—"}</td>
                <td className="td">{br?.total ? `${br.total}m${br.flagged ? " ⚠" : ""}` : "—"}</td>
                <td className="td">{r.late_minutes ? `${r.late_minutes}m` : "—"}</td>
                <td className="td">{r.overtime_minutes ? `${r.overtime_minutes}m` : "—"}</td>
                <td className="td"><Badge value={r.status} /></td>
                <td className="td">
                  {r.flagged && (
                    <span title={`Clocked from outside store network (${r.clock_in_ip ?? "?"})`}>
                      <AlertTriangle size={14} className="text-amber-500" />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
