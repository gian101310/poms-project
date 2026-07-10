import { requireProfile, isSupervisorUp } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr, fmtDateTime } from "@/lib/tz";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { HandoverForm, ApproveButtons } from "./handover-form";

export const dynamic = "force-dynamic";

export default async function HandoverPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const today = todayStr();

  // My instance today → which dept/shift the handover belongs to
  const { data: myInstance } = await supabase.from("checklist_instances")
    .select("department_id, shift_id, departments(name), shifts(name)")
    .eq("profile_id", profile.id).eq("work_date", today).limit(1).maybeSingle();

  const { data: mine } = await supabase.from("shift_handovers")
    .select("*").eq("profile_id", profile.id).eq("work_date", today).maybeSingle();

  // Supervisors: handovers awaiting approval; everyone: recent handovers in my departments
  const { data: deptHandovers } = await supabase.from("shift_handovers")
    .select("*, profiles(full_name, employee_code), departments(name), shifts(name)")
    .gte("work_date", new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10))
    .neq("profile_id", profile.id)
    .order("submitted_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <PageHeader title="Shift Handover" subtitle={today} />

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">My Handover Today</h2>
        {myInstance || mine ? (
          <HandoverForm
            existing={mine}
            departmentId={mine?.department_id ?? (myInstance as any)?.department_id}
            shiftId={mine?.shift_id ?? (myInstance as any)?.shift_id}
            deptName={(myInstance as any)?.departments?.name}
            shiftName={(myInstance as any)?.shifts?.name}
          />
        ) : (
          <EmptyState message="No shift assigned today — no handover required." />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Handovers (my departments)</h2>
        {(!deptHandovers || deptHandovers.length === 0) ? (
          <EmptyState message="No handovers from teammates in the last 3 days." />
        ) : (
          <div className="space-y-2">
            {deptHandovers.map((h: any) => (
              <div key={h.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{h.profiles?.full_name} — {h.departments?.name} · {h.shifts?.name}</p>
                    <p className="text-xs text-slate-500">{h.work_date} · submitted {fmtDateTime(h.submitted_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge value={h.status} />
                    {isSupervisorUp(profile.role) && h.status === "submitted" && <ApproveButtons id={h.id} />}
                    {h.status === "approved" && !h.acknowledged_at && h.profile_id !== profile.id && (
                      <ApproveButtons id={h.id} ackOnly />
                    )}
                  </div>
                </div>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  {[
                    ["Issues", h.issues], ["Pending", h.pending_summary],
                    ["Animal concerns", h.animal_concerns], ["Inventory", h.inventory_concerns],
                    ["Maintenance", h.maintenance_requests], ["Customer follow-ups", h.customer_followups],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string}>
                      <p className="text-xs font-semibold uppercase text-slate-400">{k}</p>
                      <p>{v}</p>
                    </div>
                  ))}
                </div>
                {h.acknowledged_at && <p className="mt-2 text-xs text-green-600">Acknowledged by incoming shift {fmtDateTime(h.acknowledged_at)}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
