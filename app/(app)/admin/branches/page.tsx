import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, Table } from "@/components/ui";
import { BranchForm, EditBranch } from "./branch-forms";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const [{ data: branches }, { data: staffCounts }] = await Promise.all([
    supabase
    .from("stores")
      .select("*, departments(id)")
      .order("name"),
    supabase
      .from("profiles")
      .select("store_id")
      .eq("status", "active")
      .neq("role", "super_admin")
      .neq("employee_code", "BOSSG"),
  ]);
  const countByBranch = new Map<string, number>();
  for (const staff of staffCounts ?? []) {
    countByBranch.set(staff.store_id, (countByBranch.get(staff.store_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader title="Branches" subtitle="Create branches and assign employees to them."
        action={<BranchForm />} />
      <Table headers={["Branch", "Code", "Employees", "Departments", "Status", ""]}>
        {(branches ?? []).map((b: any) => (
          <tr key={b.id}>
            <td className="td font-medium">{b.name}</td>
            <td className="td font-mono text-xs">{b.code}</td>
            <td className="td">{countByBranch.get(b.id) ?? 0}</td>
            <td className="td">{b.departments?.length ?? 0}</td>
            <td className="td"><Badge value={b.is_active ? "active" : "suspended"} /></td>
            <td className="td"><EditBranch branch={b} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
