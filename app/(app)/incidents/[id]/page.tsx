import { requireProfile, isSupervisorUp, isManagerUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/tz";
import { IncidentReview } from "../incident-review";

export const dynamic = "force-dynamic";

export default async function IncidentDetail({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { data: inc } = await supabase.from("incident_reports")
    .select("*, profiles!incident_reports_reporter_id_fkey(full_name, employee_code), departments(name)")
    .eq("id", params.id).single();

  if (!inc) return <EmptyState message="Incident not found or you don't have access." />;

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Incident — ${inc.category.replace(/_/g, " ")}`}
        subtitle={`Reported by ${inc.profiles?.full_name} (${inc.profiles?.employee_code}) · ${fmtDateTime(inc.created_at)}`}
        action={<Badge value={inc.status} />} />

      <div className="card space-y-4 p-5">
        {[["Department", inc.departments?.name], ["Occurred at", inc.occurred_at ? fmtDateTime(inc.occurred_at) : null],
          ["Description", inc.description], ["Root Cause", inc.root_cause],
          ["Corrective Action", inc.corrective_action], ["Supervisor Comments", inc.supervisor_comments],
          ["Management Decision", inc.management_decision]]
          .filter(([, v]) => v).map(([k, v]) => (
            <div key={k as string}>
              <p className="text-xs font-semibold uppercase text-slate-400">{k}</p>
              <p className="text-sm">{v}</p>
            </div>
          ))}
      </div>

      {isSupervisorUp(profile.role) && inc.status !== "closed" && (
        <IncidentReview id={inc.id} status={inc.status} isManager={isManagerUp(profile.role)} />
      )}
    </div>
  );
}
