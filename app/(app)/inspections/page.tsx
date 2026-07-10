import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { fmtDate } from "@/lib/tz";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InspectionsPage() {
  await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const { data: inspections } = await supabase.from("inspections")
    .select("*, departments(name), profiles(full_name)")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div>
      <PageHeader title="Inspections"
        action={<Link href="/inspections/new" className="btn-primary"><Plus size={16} /> New Inspection</Link>} />
      {(!inspections || inspections.length === 0) ? (
        <EmptyState message="No inspections yet." />
      ) : (
        <Table headers={["Type", "Department", "Inspector", "Score", "Status", "Date"]}>
          {inspections.map((i: any) => (
            <tr key={i.id} className="table-row">
              <td className="td capitalize">
                <Link href={`/inspections/${i.id}`} className="font-medium text-brand-600 hover:underline">
                  {i.inspection_type.replace(/_/g, " ")}
                </Link>
              </td>
              <td className="td">{i.departments?.name}</td>
              <td className="td">{i.profiles?.full_name}</td>
              <td className="td font-semibold">
                {i.total_score != null && i.max_score ? `${i.total_score}/${i.max_score}` : "—"}
              </td>
              <td className="td"><Badge value={i.status} /></td>
              <td className="td text-xs text-slate-500">{fmtDate(i.work_date)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
