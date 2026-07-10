import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { fmtDateTime } from "@/lib/tz";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  await requireProfile();
  const supabase = createClient();
  const { data: incidents } = await supabase.from("incident_reports")
    .select("*, profiles!incident_reports_reporter_id_fkey(full_name, employee_code), departments(name)")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div>
      <PageHeader title="Incident Reports"
        action={<Link href="/incidents/new" className="btn-primary"><Plus size={16} /> New Incident</Link>} />
      {(!incidents || incidents.length === 0) ? (
        <EmptyState message="No incident reports." />
      ) : (
        <Table headers={["Category", "Description", "Reporter", "Department", "Status", "Date"]}>
          {incidents.map((i: any) => (
            <tr key={i.id} className="table-row">
              <td className="td capitalize">
                <Link href={`/incidents/${i.id}`} className="font-medium text-brand-600 hover:underline">
                  {i.category.replace(/_/g, " ")}
                </Link>
              </td>
              <td className="td max-w-[300px] truncate">{i.description}</td>
              <td className="td">{i.profiles?.full_name}</td>
              <td className="td">{i.departments?.name ?? "—"}</td>
              <td className="td"><Badge value={i.status} /></td>
              <td className="td text-xs text-slate-500">{fmtDateTime(i.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
