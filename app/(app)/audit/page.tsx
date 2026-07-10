import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Table } from "@/components/ui";
import { fmtDateTime } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: { table?: string; page?: string } }) {
  await requireRole(["super_admin", "manager"]);
  const supabase = createClient();
  const page = Math.max(0, Number(searchParams.page ?? 0));
  const pageSize = 50;

  let query = supabase.from("audit_log")
    .select("id, table_name, row_id, action, actor_id, created_at, new_data")
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (searchParams.table) query = query.eq("table_name", searchParams.table);

  const { data: logs } = await query;

  // Resolve actor names
  const actorIds = Array.from(new Set((logs ?? []).map((l: any) => l.actor_id).filter(Boolean)));
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, employee_code").in("id", actorIds)
    : { data: [] as any[] };
  const actorMap = Object.fromEntries((actors ?? []).map((a: any) => [a.id, `${a.full_name} (${a.employee_code})`]));

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Every change, permanently recorded" />
      <form className="mb-4 flex max-w-md gap-2">
        <input name="table" defaultValue={searchParams.table ?? ""} className="input" placeholder="Filter by table (e.g. checklist_tasks)" />
        <button className="btn-secondary">Filter</button>
      </form>
      {(!logs || logs.length === 0) ? (
        <EmptyState message="No audit entries." />
      ) : (
        <Table headers={["When", "Table", "Action", "Actor", "Row"]}>
          {logs.map((l: any) => (
            <tr key={l.id} className="table-row">
              <td className="td text-xs text-slate-500">{fmtDateTime(l.created_at)}</td>
              <td className="td font-mono text-xs">{l.table_name}</td>
              <td className="td text-xs font-semibold">{l.action}</td>
              <td className="td text-xs">{l.actor_id ? actorMap[l.actor_id] ?? "system" : "system"}</td>
              <td className="td font-mono text-[10px] text-slate-400">{l.row_id?.slice(0, 8)}</td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex gap-2">
        {page > 0 && <a className="btn-secondary" href={`/audit?page=${page - 1}${searchParams.table ? `&table=${searchParams.table}` : ""}`}>← Newer</a>}
        {(logs?.length ?? 0) === pageSize && <a className="btn-secondary" href={`/audit?page=${page + 1}${searchParams.table ? `&table=${searchParams.table}` : ""}`}>Older →</a>}
      </div>
    </div>
  );
}
