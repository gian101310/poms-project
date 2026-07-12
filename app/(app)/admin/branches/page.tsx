import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, Table } from "@/components/ui";
import { BranchForm, EditBranch } from "./branch-forms";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  await requireRole(["super_admin"]);
  const supabase = createClient();
  const { data: branches } = await supabase
    .from("stores")
    .select("*, profiles(id), departments(id)")
    .order("name");

  return (
    <div>
      <PageHeader title="Branches" subtitle="Create branches and assign employees to them."
        action={<BranchForm />} />
      <Table headers={["Branch", "Code", "Employees", "Departments", "Status", ""]}>
        {(branches ?? []).map((b: any) => (
          <tr key={b.id}>
            <td className="td font-medium">{b.name}</td>
            <td className="td font-mono text-xs">{b.code}</td>
            <td className="td">{b.profiles?.length ?? 0}</td>
            <td className="td">{b.departments?.length ?? 0}</td>
            <td className="td"><Badge value={b.is_active ? "active" : "suspended"} /></td>
            <td className="td"><EditBranch branch={b} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
