import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { fmtDate } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function InspectionDetail({ params }: { params: { id: string } }) {
  await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const { data: insp } = await supabase.from("inspections")
    .select("*, departments(name), profiles(full_name, employee_code), inspection_items(*)")
    .eq("id", params.id).single();

  if (!insp) return <EmptyState message="Inspection not found." />;
  const items = (insp.inspection_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const pct = insp.max_score ? Math.round((insp.total_score / insp.max_score) * 100) : null;

  let signatureUrl: string | null = null;
  if (insp.signature_path) {
    const { data } = await supabase.storage.from("signatures").createSignedUrl(insp.signature_path, 3600);
    signatureUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`${insp.inspection_type.replace(/_/g, " ")} inspection — ${insp.departments?.name}`}
        subtitle={`By ${insp.profiles?.full_name} (${insp.profiles?.employee_code}) · ${fmtDate(insp.work_date)}`}
        action={<Badge value={insp.status} />} />

      <div className="card mb-4 p-5">
        <p className="text-sm text-slate-500">Total Score</p>
        <p className="text-3xl font-bold">
          {insp.total_score ?? "—"}<span className="text-base font-normal text-slate-400"> / {insp.max_score ?? "—"}{pct != null ? ` (${pct}%)` : ""}</span>
        </p>
        {insp.remarks && <p className="mt-3 text-sm">{insp.remarks}</p>}
      </div>

      <Table headers={["Criterion", "Score", "Remark"]}>
        {items.map((it: any) => (
          <tr key={it.id} className="table-row">
            <td className="td font-medium">{it.criterion}</td>
            <td className="td font-semibold">{it.score}/{it.max_score}</td>
            <td className="td text-sm text-slate-500">{it.remark || "—"}</td>
          </tr>
        ))}
      </Table>

      {signatureUrl && (
        <div className="card mt-4 p-5">
          <p className="label">Inspector Signature</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signatureUrl} alt="Signature" className="h-24 rounded bg-white" />
        </div>
      )}
    </div>
  );
}
