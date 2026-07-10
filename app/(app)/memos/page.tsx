import Link from "next/link";
import { requireProfile, isManagerUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { fmtDateTime } from "@/lib/tz";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemosPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const { data: memos } = await supabase.from("memos")
    .select("*, issued_to_profile:profiles!memos_issued_to_fkey(full_name, employee_code), issued_by_profile:profiles!memos_issued_by_fkey(full_name)")
    .order("issued_at", { ascending: false }).limit(100);

  return (
    <div>
      <PageHeader title="Memos"
        action={isManagerUp(profile.role)
          ? <Link href="/memos/new" className="btn-primary"><Plus size={16} /> Issue Memo</Link>
          : undefined} />
      {(!memos || memos.length === 0) ? (
        <EmptyState message="No memos." />
      ) : (
        <Table headers={["Reason", "To", "From", "Status", "Issued"]}>
          {memos.map((m: any) => (
            <tr key={m.id} className="table-row">
              <td className="td">
                <Link href={`/memos/${m.id}`} className="font-medium text-brand-600 hover:underline">{m.reason}</Link>
              </td>
              <td className="td">{m.issued_to_profile?.full_name}</td>
              <td className="td">{m.issued_by_profile?.full_name}</td>
              <td className="td"><Badge value={m.status} /></td>
              <td className="td text-xs text-slate-500">{fmtDateTime(m.issued_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
