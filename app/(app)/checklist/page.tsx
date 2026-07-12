import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/tz";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { TaskCard } from "./task-card";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const today = todayStr();

  const { data: instances } = await supabase
    .from("checklist_instances")
    .select("id, status, work_date, departments(name), shifts(name), checklist_tasks(*, template_tasks(estimated_minutes))")
    .eq("profile_id", profile.id)
    .eq("work_date", today)
    .order("generated_at");

  return (
    <div>
      <PageHeader title="My Checklist" subtitle={today} />
      {(!instances || instances.length === 0) && (
        <EmptyState message="No checklist for today. Checklists are generated automatically from your schedule." />
      )}
      {(instances ?? []).map((inst: any) => {
        const tasks = (inst.checklist_tasks ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
        const done = tasks.filter((t: any) => ["completed", "verified"].includes(t.status)).length;
        return (
          <section key={inst.id} className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{inst.departments?.name} — {inst.shifts?.name}</h2>
                <p className="text-sm text-slate-500">{done}/{tasks.length} done</p>
              </div>
              <Badge value={inst.status} />
            </div>
            <div className="space-y-2">
              {tasks.map((t: any) => <TaskCard key={t.id} task={t} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
