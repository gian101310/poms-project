import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { BranchFilter } from "@/components/branch-filter";
import { fmtDate } from "@/lib/tz";
import { EmployeeForm, EmployeeRowActions, EditEmployee } from "./employee-forms";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({ searchParams }: { searchParams: { branch?: string } }) {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const selectedBranch = searchParams.branch && searchParams.branch !== "all" ? searchParams.branch : null;

  let employeesQuery = supabase.from("profiles")
      .select("*, stores(id, name, code), positions(title), department_assignments(department_id, is_primary_supervisor, departments(name))")
      .eq("status", "active")
      .order("created_at", { ascending: false });
  let departmentsQuery = supabase.from("departments").select("id, store_id, name").eq("is_active", true).order("name");
  let sectionsQuery = supabase.from("sections").select("id, department_id, name, departments!inner(id, name, store_id)").eq("is_active", true).order("name");
  let sectionAssignQuery = supabase.from("staff_section_assignments").select("profile_id, section_id, is_primary, sections!inner(name, departments!inner(name, store_id))");
  if (selectedBranch) {
    employeesQuery = employeesQuery.eq("store_id", selectedBranch);
    departmentsQuery = departmentsQuery.eq("store_id", selectedBranch);
    sectionsQuery = sectionsQuery.eq("departments.store_id", selectedBranch);
    sectionAssignQuery = sectionAssignQuery.eq("sections.departments.store_id", selectedBranch);
  }

  const [{ data: employees }, { data: departments }, { data: positions }, { data: branches }, { data: sections }, sectionAssignRes] = await Promise.all([
    employeesQuery,
    departmentsQuery,
    supabase.from("positions").select("id, title, level").eq("is_active", true).order("title"),
    supabase.from("stores").select("id, name, code").eq("is_active", true).order("name"),
    sectionsQuery,
    sectionAssignQuery,
  ]);
  const sectionAssignments = sectionAssignRes.error ? [] : (sectionAssignRes.data ?? []);
  const sectionMap = new Map<string, any[]>();
  for (const a of sectionAssignments as any[]) {
    const list = sectionMap.get(a.profile_id) ?? [];
    list.push(a);
    sectionMap.set(a.profile_id, list);
  }

  return (
    <div>
      <PageHeader title="Employees" subtitle={`${employees?.length ?? 0} accounts`}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <BranchFilter branches={branches ?? []} selected={selectedBranch ?? "all"} />
            <EmployeeForm departments={departments ?? []} positions={positions ?? []} branches={selectedBranch ? (branches ?? []).filter((b: any) => b.id === selectedBranch) : (branches ?? [])} sections={sections ?? []} />
          </div>
        } />
      {(!employees || employees.length === 0) ? (
        <EmptyState message="No employees yet. Create the first account." />
      ) : (
        <Table headers={["ID", "Name", "Branch", "Role", "Departments / Sections", "Hired", "Status", ""]}>
          {employees.map((e: any) => (
            <tr key={e.id} className="table-row">
              <td className="td font-mono text-xs">{e.employee_code}</td>
              <td className="td">
                <p className="font-medium">{e.full_name}</p>
                <p className="text-xs text-slate-500">{e.positions?.title ?? "—"}{e.phone ? ` · ${e.phone}` : ""}</p>
              </td>
              <td className="td text-xs">{e.stores?.name ?? "—"}</td>
              <td className="td"><Badge value={e.role} /></td>
              <td className="td text-xs">
                <p>{(e.department_assignments ?? []).map((da: any) =>
                  `${da.departments?.name}${da.is_primary_supervisor ? " ★" : ""}`).join(", ") || "—"}</p>
                <p className="mt-1 text-slate-400">
                  {(sectionMap.get(e.id) ?? []).map((sa: any) =>
                    `${sa.sections?.departments?.name}: ${sa.sections?.name}${sa.is_primary ? " ★" : ""}`).join(", ") || "No section"}
                </p>
              </td>
              <td className="td text-xs">{fmtDate(e.date_hired)}</td>
              <td className="td"><Badge value={e.status} /></td>
              <td className="td">
                <div className="flex gap-1">
                  <EditEmployee employee={{ ...e, staff_section_assignments: sectionMap.get(e.id) ?? [] }} departments={departments ?? []} positions={positions ?? []} branches={branches ?? []} sections={sections ?? []} />
                  <EmployeeRowActions employee={e} departments={departments ?? []} />
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
