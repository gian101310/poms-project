import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/tz";
import { PageHeader, Table, EmptyState } from "@/components/ui";
import { ShiftForm, ScheduleForm } from "./shift-forms";
import { fmtDate } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const today = todayStr();

  const [{ data: shifts }, { data: employees }, { data: upcoming }] = await Promise.all([
    supabase.from("shifts").select("*").order("start_time"),
    supabase.from("profiles").select("id, full_name, employee_code").eq("status", "active").order("full_name"),
    supabase.from("employee_schedules")
      .select("*, profiles!employee_schedules_profile_id_fkey(full_name, employee_code), shifts(name)")
      .gte("work_date", today).order("work_date").limit(200),
  ]);

  return (
    <div>
      <PageHeader title="Shifts & Schedules" action={<ShiftForm />} />

      <h2 className="mb-3 text-lg font-semibold">Shift Definitions</h2>
      <Table headers={["Name", "Start", "End", "Grace (min)"]}>
        {(shifts ?? []).map((s: any) => (
          <tr key={s.id} className="table-row">
            <td className="td font-medium">{s.name}</td>
            <td className="td">{s.start_time?.slice(0, 5)}</td>
            <td className="td">{s.end_time?.slice(0, 5)}</td>
            <td className="td">{s.grace_minutes}</td>
          </tr>
        ))}
      </Table>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming Schedules</h2>
        <ScheduleForm employees={employees ?? []} shifts={shifts ?? []} />
      </div>
      <div className="mt-3">
        {(!upcoming || upcoming.length === 0) ? (
          <EmptyState message="No schedules yet. Assign employees to shifts — daily checklists are generated from this." />
        ) : (
          <Table headers={["Date", "Employee", "Shift", "Status"]}>
            {upcoming.map((s: any) => (
              <tr key={s.id} className="table-row">
                <td className="td">{fmtDate(s.work_date)}</td>
                <td className="td">{s.profiles?.full_name} <span className="text-xs text-slate-400">({s.profiles?.employee_code})</span></td>
                <td className="td">{s.shifts?.name ?? "—"}</td>
                <td className="td capitalize">{s.status}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
