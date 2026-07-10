import { requireProfile, isSupervisorUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table, StatCard } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const profile = await requireProfile();
  const supabase = createClient();

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const query = supabase.from("attendance_records")
    .select("*, profiles(full_name, employee_code)")
    .gte("work_date", since)
    .order("work_date", { ascending: false });

  const { data: records } = isSupervisorUp(profile.role)
    ? await query.limit(200)
    : await query.eq("profile_id", profile.id);

  const mine = (records ?? []).filter((r: any) => r.profile_id === profile.id);
  const lateCount = mine.filter((r: any) => r.status === "late").length;
  const absentCount = mine.filter((r: any) => r.status === "absent").length;
  const otMinutes = mine.reduce((s: number, r: any) => s + (r.overtime_minutes ?? 0), 0);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Last 30 days" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Days Recorded" value={mine.length} />
        <StatCard label="Late" value={lateCount} />
        <StatCard label="Absent" value={absentCount} />
        <StatCard label="Overtime" value={`${Math.round(otMinutes / 60)}h ${otMinutes % 60}m`} />
      </div>
      {(!records || records.length === 0) ? (
        <EmptyState message="No attendance records yet." />
      ) : (
        <Table headers={isSupervisorUp(profile.role)
          ? ["Date", "Employee", "In", "Out", "Late", "OT", "Status"]
          : ["Date", "In", "Out", "Late", "OT", "Status"]}>
          {records.map((r: any) => (
            <tr key={r.id} className="table-row">
              <td className="td">{fmtDate(r.work_date)}</td>
              {isSupervisorUp(profile.role) && <td className="td">{r.profiles?.full_name}</td>}
              <td className="td">{r.clock_in ? fmtTime(r.clock_in) : "—"}</td>
              <td className="td">{r.clock_out ? fmtTime(r.clock_out) : "—"}</td>
              <td className="td">{r.late_minutes ? `${r.late_minutes}m` : "—"}</td>
              <td className="td">{r.overtime_minutes ? `${r.overtime_minutes}m` : "—"}</td>
              <td className="td"><Badge value={r.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
