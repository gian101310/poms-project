import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/tz";
import { PageHeader, Table, EmptyState, Badge } from "@/components/ui";
import { ShiftForm, ScheduleForm, RotationForm, EditShift } from "./shift-forms";
import { fmtDate } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const today = todayStr();

  const [{ data: shifts }, { data: employees }, { data: upcoming }] = await Promise.all([
    supabase.from("shifts").select("*").order("start_time"),
    supabase.from("profiles").select("id, full_name, employee_code").eq("status", "active").neq("role", "super_admin").neq("employee_code", "BOSSG").order("full_name"),
    supabase.from("employee_schedules")
      .select("*, profiles!employee_schedules_profile_id_fkey(full_name, employee_code), shifts(name)")
      .gte("work_date", today).order("work_date").limit(200),
  ]);

  const activeShifts = (shifts ?? []).filter((s: any) => s.is_active);

  return (
    <div>
      <PageHeader title="Shifts & Schedules"
        subtitle="Shift timings are fully customizable — the whole system follows them."
        action={<ShiftForm />} />

      <h2 className="mb-3 text-lg font-semibold">Shift Definitions</h2>
      <Table headers={["Name", "Start", "End", "Grace", "Standard Hours", "Built-in OT", "Status", ""]}>
        {(shifts ?? []).map((s: any) => {
          const lenMin = (() => {
            const [sh, sm] = s.start_time.split(":").map(Number);
            const [eh, em] = s.end_time.split(":").map(Number);
            return eh * 60 + em - (sh * 60 + sm);
          })();
          const std = s.standard_minutes ?? lenMin;
          const ot = Math.max(0, lenMin - std);
          return (
            <tr key={s.id} className="table-row">
              <td className="td font-medium">{s.name}</td>
              <td className="td">{s.start_time?.slice(0, 5)}</td>
              <td className="td">{s.end_time?.slice(0, 5)}</td>
              <td className="td">{s.grace_minutes}m</td>
              <td className="td">{Math.floor(std / 60)}h{std % 60 ? ` ${std % 60}m` : ""}</td>
              <td className="td">{ot > 0 ? `${Math.floor(ot / 60)}h${ot % 60 ? ` ${ot % 60}m` : ""}/day` : "—"}</td>
              <td className="td"><Badge value={s.is_active ? "active" : "closed"} /></td>
              <td className="td"><EditShift shift={s} /></td>
            </tr>
          );
        })}
      </Table>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Schedules</h2>
        <div className="flex gap-2">
          <RotationForm employees={employees ?? []} shifts={activeShifts} />
          <ScheduleForm employees={employees ?? []} shifts={activeShifts} />
        </div>
      </div>
      <div className="mt-3">
        {(!upcoming || upcoming.length === 0) ? (
          <EmptyState message="No schedules yet. Use Rotation for counterpart pairs, or Assign Schedule for one person." />
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
