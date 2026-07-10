import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/tz";
import { PageHeader, EmptyState } from "@/components/ui";
import { VerifyCard } from "./verify-card";

export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  await requireRole(["super_admin", "manager", "supervisor"]);
  const supabase = createClient();
  const today = todayStr();

  const { data: tasks } = await supabase
    .from("checklist_tasks")
    .select("*, checklist_instances!inner(work_date, profile_id, departments(name), shifts(name), profiles(full_name, employee_code)), task_photos(storage_path)")
    .eq("status", "completed")
    .eq("checklist_instances.work_date", today)
    .order("completed_at", { ascending: true });

  return (
    <div>
      <PageHeader title="Verification Queue" subtitle={`Completed tasks awaiting verification — ${today}`} />
      {(!tasks || tasks.length === 0)
        ? <EmptyState message="Nothing waiting for verification. All caught up." />
        : <div className="space-y-2">{tasks.map((t: any) => <VerifyCard key={t.id} task={t} />)}</div>}
    </div>
  );
}
