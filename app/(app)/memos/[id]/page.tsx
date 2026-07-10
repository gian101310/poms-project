import { requireProfile, isManagerUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/tz";
import { MemoActions } from "../memo-actions";

export const dynamic = "force-dynamic";

export default async function MemoDetail({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { data: memo } = await supabase.from("memos")
    .select("*, issued_to_profile:profiles!memos_issued_to_fkey(full_name, employee_code), issued_by_profile:profiles!memos_issued_by_fkey(full_name)")
    .eq("id", params.id).single();

  if (!memo) return <EmptyState message="Memo not found or you don't have access." />;

  return (
    <div className="max-w-3xl">
      <PageHeader title={memo.reason}
        subtitle={`To ${memo.issued_to_profile?.full_name} · From ${memo.issued_by_profile?.full_name} · ${fmtDateTime(memo.issued_at)}`}
        action={<Badge value={memo.status} />} />
      <div className="card space-y-4 p-5">
        {memo.body && <p className="whitespace-pre-wrap text-sm">{memo.body}</p>}
        {memo.acknowledged_at && (
          <p className="text-xs text-green-600">Acknowledged {fmtDateTime(memo.acknowledged_at)}</p>
        )}
        {memo.employee_response && (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Employee Response</p>
            <p className="text-sm">{memo.employee_response}</p>
          </div>
        )}
        {memo.manager_decision && (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Manager Decision</p>
            <p className="text-sm">{memo.manager_decision}</p>
          </div>
        )}
      </div>
      <MemoActions memo={memo} isRecipient={memo.issued_to === profile.id} isManager={isManagerUp(profile.role)} />
    </div>
  );
}
