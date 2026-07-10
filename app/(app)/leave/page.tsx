import { requireProfile, isManagerUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState, Table } from "@/components/ui";
import { fmtDate } from "@/lib/tz";
import { LeaveForm, LeaveReview } from "./leave-form";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const { data: requests } = await supabase.from("leave_requests")
    .select("*, profiles!leave_requests_profile_id_fkey(full_name, employee_code)")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div>
      <PageHeader title="Leave Requests" action={<LeaveForm />} />
      {(!requests || requests.length === 0) ? (
        <EmptyState message="No leave requests." />
      ) : (
        <Table headers={["Employee", "Type", "From", "To", "Reason", "Status", ""]}>
          {requests.map((r: any) => (
            <tr key={r.id} className="table-row">
              <td className="td">{r.profiles?.full_name}</td>
              <td className="td capitalize">{r.leave_type}</td>
              <td className="td">{fmtDate(r.date_from)}</td>
              <td className="td">{fmtDate(r.date_to)}</td>
              <td className="td max-w-[200px] truncate">{r.reason || "—"}</td>
              <td className="td"><Badge value={r.status} /></td>
              <td className="td">
                {isManagerUp(profile.role) && r.status === "pending" && <LeaveReview id={r.id} />}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
