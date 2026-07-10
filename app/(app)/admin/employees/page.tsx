import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { fmtDate } from "@/lib/tz";
import { EmployeeForm, EmployeeRowActions } from "./employee-forms";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();

  const [{ data: employees }, { data: departments }, { data: positions }] = await Promise.all([
    supabase.from("profiles")
      .select("*, positions(title), department_assignments(department_id, is_primary_supervisor, departments(name))")
      .order("created_at", { ascending: false }),
    supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
    supabase.from("positions").select("id, title, level").eq("is_active", true).order("title"),
  ]);

  return (
    <div>
      <PageHeader title="Employees" subtitle={`${employees?.length ?? 0} accounts`}
        action={<EmployeeForm departments={departments ?? []} positions={positions ?? []} />} />
      {(!employees || employees.length === 0) ? (
        <EmptyState message="No employees yet. Create the first account." />
      ) : (
        <Table headers={["ID", "Name", "Role", "Departments", "Hired", "Status", ""]}>
          {employees.map((e: any) => (
            <tr key={e.id} className="table-row">
              <td className="td font-mono text-xs">{e.employee_code}</td>
              <td className="td">
                <p className="font-medium">{e.full_name}</p>
                <p className="text-xs text-slate-500">{e.positions?.title ?? "—"}{e.phone ? ` · ${e.phone}` : ""}</p>
              </td>
              <td className="td"><Badge value={e.role} /></td>
              <td className="td text-xs">
                {(e.department_assignments ?? []).map((da: any) =>
                  `${da.departments?.name}${da.is_primary_supervisor ? " ★" : ""}`).join(", ") || "—"}
              </td>
              <td className="td text-xs">{fmtDate(e.date_hired)}</td>
              <td className="td"><Badge value={e.status} /></td>
              <td className="td"><EmployeeRowActions employee={e} departments={departments ?? []} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
