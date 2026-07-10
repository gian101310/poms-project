import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, Table } from "@/components/ui";
import { DeptForm, DeptToggle } from "./dept-forms";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { data: departments } = await supabase.from("departments")
    .select("*, department_assignments(profile_id, is_primary_supervisor, profiles(full_name))")
    .order("name");

  return (
    <div>
      <PageHeader title="Departments" action={<DeptForm />} />
      <Table headers={["Name", "Code", "Supervisor(s)", "Staff", "Status", ""]}>
        {(departments ?? []).map((d: any) => {
          const sups = (d.department_assignments ?? []).filter((a: any) => a.is_primary_supervisor);
          return (
            <tr key={d.id} className="table-row">
              <td className="td font-medium">{d.name}</td>
              <td className="td font-mono text-xs">{d.code}</td>
              <td className="td text-xs">{sups.map((s: any) => s.profiles?.full_name).join(", ") || "—"}</td>
              <td className="td">{(d.department_assignments ?? []).length}</td>
              <td className="td"><Badge value={d.is_active ? "active" : "suspended"} /></td>
              <td className="td"><DeptToggle id={d.id} isActive={d.is_active} /></td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
